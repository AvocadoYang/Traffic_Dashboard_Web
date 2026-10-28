/**
 * 在網格化之前先把 STEP 裡不要的零件拿掉。
 *
 * OpenCascade 讀 STEP 的記憶體大約跟檔案大小成正比 (MiR250 的 161MB 要超過 2GB),
 * 但整台車的組件裡大部分是螺絲、電路板、相機內部這些外面看不到的東西。這裡直接處理 STEP 的文字:
 * 從最上層的組件沿著組裝關係 (NEXT_ASSEMBLY_USAGE_OCCURRENCE) 往下走, 要丟的零件不走進去,
 * 只留下走得到的零件的形狀定義和它們引用到的所有實體, 加上這些幾何的顏色。
 *
 * STEP 的實體: #編號=類型(參數); 參數裡用 #編號 引用別的實體。
 */

/** DATA 區塊切成一個一個實體: 編號 -> 文字 (含結尾的分號); 字串裡的分號不算 */
function parseEntities(text) {
  const start = text.indexOf("DATA;") + 5;
  const end = text.lastIndexOf("ENDSEC;");
  const entities = new Map();
  let i = start;
  while (i < end) {
    const hash = text.indexOf("#", i);
    if (hash < 0 || hash >= end) break;
    let j = hash;
    let quoted = false;
    for (; j < end; j++) {
      const c = text.charCodeAt(j);
      if (c === 39 /* ' */) quoted = !quoted;
      else if (c === 59 /* ; */ && !quoted) break;
    }
    const body = text.slice(hash, j + 1);
    const eq = body.indexOf("=");
    entities.set(Number(body.slice(1, eq)), body);
    i = j + 1;
  }
  return { entities, header: text.slice(0, start) };
}

/** 類型名稱; 複合實體 #1=(A()B()) 取第一個 */
const typeOf = (body) => {
  const m = /^#\d+\s*=\s*\(?\s*([A-Z0-9_]+)/.exec(body);
  return m ? m[1] : "";
};

/** 引用到的實體編號 (字串裡的 # 不算) */
const refsOf = (body) => {
  const out = [];
  const eq = body.indexOf("=");
  let quoted = false;
  for (let i = eq + 1; i < body.length; i++) {
    const c = body.charCodeAt(i);
    if (c === 39) quoted = !quoted;
    else if (c === 35 /* # */ && !quoted) {
      let j = i + 1;
      while (j < body.length && body.charCodeAt(j) >= 48 && body.charCodeAt(j) <= 57) j++;
      out.push(Number(body.slice(i + 1, j)));
      i = j - 1;
    }
  }
  return out;
};

/** 最外層的參數 (逗號分開, 括號、字串裡的不算) */
const argsOf = (body) => {
  const open = body.indexOf("(", body.indexOf("="));
  const out = [];
  let depth = 0;
  let quoted = false;
  let from = open + 1;
  for (let i = open + 1; i < body.length; i++) {
    const c = body[i];
    if (c === "'") quoted = !quoted;
    if (quoted) continue;
    if (c === "(") depth++;
    else if (c === ")" && depth-- === 0) {
      out.push(body.slice(from, i).trim());
      break;
    } else if (c === "," && depth === 0) {
      out.push(body.slice(from, i).trim());
      from = i + 1;
    }
  }
  return out;
};

/** 第 n 個字串參數 (STEP 的字串用單引號, 兩個單引號是跳脫) */
const stringArg = (body, n) => {
  const re = /'((?:[^']|'')*)'/g;
  let m;
  for (let k = 0; (m = re.exec(body)); k++) if (k === n) return m[1].replace(/''/g, "'");
  return "";
};

/** 解析 STEP 的組裝結構, pruneStep / topLevelParts 共用 */
function analyze(text) {
  const { entities, header } = parseEntities(text);
  const byType = new Map();
  for (const [id, body] of entities) {
    const t = typeOf(body);
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t).push(id);
  }
  const ofType = (...types) => types.flatMap((t) => byType.get(t) ?? []);

  // 零件定義 (PRODUCT_DEFINITION) -> 零件名稱: PRODUCT_DEFINITION -> FORMATION -> PRODUCT
  const productIdOfPd = new Map();
  for (const pd of ofType("PRODUCT_DEFINITION")) {
    const pdf = refsOf(entities.get(pd))[0];
    const product = refsOf(entities.get(pdf) ?? "")[0];
    productIdOfPd.set(pd, stringArg(entities.get(product) ?? "", 0));
  }

  // 組裝關係: 父 -> [NAUO], 誰被當成子件
  const nauos = new Map();
  const isChild = new Set();
  for (const nauo of ofType("NEXT_ASSEMBLY_USAGE_OCCURRENCE")) {
    const [parent, child] = refsOf(entities.get(nauo));
    if (!nauos.has(parent)) nauos.set(parent, []);
    nauos.get(parent).push({ nauo, child });
    isChild.add(child);
  }
  // 形狀: 零件定義 / NAUO <- PRODUCT_DEFINITION_SHAPE <- SHAPE_DEFINITION_REPRESENTATION / CONTEXT_DEPENDENT_SHAPE_REPRESENTATION
  const pdsOf = new Map();
  for (const pds of ofType("PRODUCT_DEFINITION_SHAPE")) {
    const target = refsOf(entities.get(pds))[0];
    if (!pdsOf.has(target)) pdsOf.set(target, []);
    pdsOf.get(target).push(pds);
  }
  const usersOfPds = new Map();
  for (const id of ofType("SHAPE_DEFINITION_REPRESENTATION", "CONTEXT_DEPENDENT_SHAPE_REPRESENTATION")) {
    for (const r of refsOf(entities.get(id))) {
      if (!usersOfPds.has(r)) usersOfPds.set(r, []);
      usersOfPds.get(r).push(id);
    }
  }
  const roots = [...productIdOfPd.keys()].filter((pd) => !isChild.has(pd));
  return { entities, header, ofType, productIdOfPd, nauos, pdsOf, usersOfPds, roots };
}

/**
 * 從最上層的組件往下走, 收集要留的實體
 * @param {(productId: string, parentId: string) => boolean} drop 子件要不要丟 (連同底下全部)
 */
function collect(a, drop) {
  const { entities, ofType, productIdOfPd, nauos, pdsOf, usersOfPds, roots } = a;
  const keep = new Set();
  const seeds = [];
  const keptProducts = new Set();
  const droppedProducts = new Set();
  const visit = (pd) => {
    if (keptProducts.has(pd)) return;
    keptProducts.add(pd);
    for (const pds of pdsOf.get(pd) ?? []) seeds.push(...(usersOfPds.get(pds) ?? []));
    for (const { nauo, child } of nauos.get(pd) ?? []) {
      if (drop(productIdOfPd.get(child) ?? "", productIdOfPd.get(pd) ?? "")) {
        droppedProducts.add(child);
        continue;
      }
      for (const pds of pdsOf.get(nauo) ?? []) seeds.push(...(usersOfPds.get(pds) ?? []));
      visit(child);
    }
  };
  for (const pd of roots) visit(pd);

  const stack = [...seeds];
  const reach = () => {
    while (stack.length) {
      const id = stack.pop();
      if (keep.has(id) || !entities.has(id)) continue;
      keep.add(id);
      stack.push(...refsOf(entities.get(id)));
    }
  };
  reach();
  // 形狀 (SHAPE_REPRESENTATION) 跟實體幾何 (ADVANCED_BREP_SHAPE_REPRESENTATION) 之間另外用一個關係實體連,
  // 沒有人引用它, 往下走不到: 連到留下來的形狀就留, 一直補到沒有新的為止
  for (let changed = true; changed; ) {
    changed = false;
    for (const id of ofType("SHAPE_REPRESENTATION_RELATIONSHIP")) {
      if (keep.has(id) || !refsOf(entities.get(id)).some((r) => keep.has(r))) continue;
      stack.push(id);
      changed = true;
    }
    reach();
  }

  // 顏色: 樣式指到留下來的幾何就留。STYLED_ITEM(名稱, 樣式, 幾何);
  // 覆蓋別的樣式的 (例如組件裡某一個零件換顏色) 還要被覆蓋的樣式、組裝路徑 (一串 NAUO) 都還在
  const refId = (arg) => Number(arg?.replace("#", ""));
  for (const si of ofType("STYLED_ITEM")) {
    if (keep.has(refId(argsOf(entities.get(si))[2]))) stack.push(si);
  }
  reach();
  for (const si of ofType("OVER_RIDING_STYLED_ITEM", "CONTEXT_DEPENDENT_OVER_RIDING_STYLED_ITEM")) {
    const [, , item, overRidden, context] = argsOf(entities.get(si));
    const path = context ? refsOf(`#0=X(${context})`) : [];
    if (keep.has(refId(item)) && keep.has(refId(overRidden)) && path.every((id) => keep.has(id))) stack.push(si);
  }
  reach();
  // 收集這些樣式的清單 (MDGPR) 改寫成只列留下來的
  const rewritten = new Map();
  for (const id of ofType("MECHANICAL_DESIGN_GEOMETRIC_PRESENTATION_REPRESENTATION")) {
    const body = entities.get(id);
    const list = /\(([^()]*)\)\s*,\s*#\d+\s*\)\s*;\s*$/.exec(body);
    if (!list) continue;
    const items = list[1].split(",").map((s) => s.trim()).filter((s) => keep.has(Number(s.slice(1))));
    if (!items.length) continue;
    const ctx = refsOf(body).pop();
    rewritten.set(id, `#${id}=MECHANICAL_DESIGN_GEOMETRIC_PRESENTATION_REPRESENTATION('',(${items.join(",")}),#${ctx});`);
    stack.push(ctx);
  }
  reach();

  return { keep, rewritten, keptProducts, droppedProducts };
}

/**
 * @param {string} text 整個 STEP 檔
 * @param {(productId: string, parentId: string) => boolean} drop 子件 (PRODUCT 的第一個參數) 要不要丟
 */
export function pruneStep(text, drop) {
  const a = analyze(text);
  const { keep, rewritten, keptProducts, droppedProducts } = collect(a, drop);
  const ids = [...keep, ...rewritten.keys()].sort((x, y) => x - y);
  const out = [a.header, "\n"];
  for (const id of ids) out.push((rewritten.get(id) ?? a.entities.get(id)).replace(/\r?\n/g, ""), "\n");
  out.push("ENDSEC;\nEND-ISO-10303-21;\n");
  const name = (pd) => a.productIdOfPd.get(pd) ?? "";
  return {
    text: out.join(""),
    kept: [...keptProducts].map(name),
    dropped: [...new Set([...droppedProducts].map(name))],
  };
}

/**
 * 最上層組件底下每個子件 (同名的算一個) 單獨留下來時 STEP 有多大 (位元組), 分批網格化時拿來分批
 * @returns {{ root: string; parts: { id: string; bytes: number }[] }}
 */
export function topLevelParts(text, drop) {
  const a = analyze(text);
  const root = a.roots[0];
  const rootId = a.productIdOfPd.get(root) ?? "";
  const ids = [...new Set((a.nauos.get(root) ?? []).map(({ child }) => a.productIdOfPd.get(child) ?? ""))];
  const parts = ids
    .filter((id) => !drop(id, rootId))
    .map((id) => {
      const { keep } = collect(a, (child, parent) => drop(child, parent) || (parent === rootId && child !== id));
      let bytes = 0;
      for (const e of keep) bytes += a.entities.get(e).length;
      return { id, bytes };
    });
  return { root: rootId, parts };
}
