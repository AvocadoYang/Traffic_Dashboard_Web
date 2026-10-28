import { describe, expect, it } from "vitest";
import { pruneStep } from "./stepPrune.mjs";

/**
 * 迷你的 STEP 組件 (Inventor 匯出的寫法): 上層組件 ASM 底下兩個零件, BODY 和 SCREW。
 * 每個零件的形狀 (SHAPE_REPRESENTATION) 跟實體幾何 (ADVANCED_BREP_SHAPE_REPRESENTATION)
 * 之間用一個沒有人引用的 SHAPE_REPRESENTATION_RELATIONSHIP 連; 顏色收在一個 MDGPR 清單裡。
 */
const step = `ISO-10303-21;
HEADER;
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
#1=PRODUCT('ASM','ASM','',(#100));
#2=PRODUCT_DEFINITION_FORMATION('','',#1);
#3=PRODUCT_DEFINITION('design','',#2,#101);
#4=PRODUCT_DEFINITION_SHAPE('','',#3);
#5=SHAPE_DEFINITION_REPRESENTATION(#4,#6);
#6=SHAPE_REPRESENTATION('',(#7),#102);
#7=AXIS2_PLACEMENT_3D('',#8,$,$);
#8=CARTESIAN_POINT('',(0.,0.,0.));
#11=PRODUCT('BODY','BODY','',(#100));
#12=PRODUCT_DEFINITION_FORMATION('','',#11);
#13=PRODUCT_DEFINITION('design','',#12,#101);
#14=PRODUCT_DEFINITION_SHAPE('','',#13);
#15=SHAPE_DEFINITION_REPRESENTATION(#14,#16);
#16=SHAPE_REPRESENTATION('',(#7),#102);
#17=ADVANCED_BREP_SHAPE_REPRESENTATION('',(#18),#102);
#18=MANIFOLD_SOLID_BREP('body; with a ''quote''',#19);
#19=CLOSED_SHELL('',(#20));
#20=CARTESIAN_POINT('',(1.,2.,3.));
#21=SHAPE_REPRESENTATION_RELATIONSHIP('SRR','None',#16,#17);
#31=PRODUCT('BN 123 screw M3','screw','',(#100));
#32=PRODUCT_DEFINITION_FORMATION('','',#31);
#33=PRODUCT_DEFINITION('design','',#32,#101);
#34=PRODUCT_DEFINITION_SHAPE('','',#33);
#35=SHAPE_DEFINITION_REPRESENTATION(#34,#36);
#36=SHAPE_REPRESENTATION('',(#7),#102);
#37=ADVANCED_BREP_SHAPE_REPRESENTATION('',(#38),#102);
#38=MANIFOLD_SOLID_BREP('screw',#39);
#39=CLOSED_SHELL('',(#40));
#40=CARTESIAN_POINT('',(9.,9.,9.));
#41=SHAPE_REPRESENTATION_RELATIONSHIP('SRR','None',#36,#37);
#51=NEXT_ASSEMBLY_USAGE_OCCURRENCE('1','','',#3,#13,$);
#52=PRODUCT_DEFINITION_SHAPE('','',#51);
#53=CONTEXT_DEPENDENT_SHAPE_REPRESENTATION(#54,#52);
#54=(REPRESENTATION_RELATIONSHIP('','',#16,#6)REPRESENTATION_RELATIONSHIP_WITH_TRANSFORMATION(#55)SHAPE_REPRESENTATION_RELATIONSHIP());
#55=ITEM_DEFINED_TRANSFORMATION('','',#7,#7);
#61=NEXT_ASSEMBLY_USAGE_OCCURRENCE('2','','',#3,#33,$);
#62=PRODUCT_DEFINITION_SHAPE('','',#61);
#63=CONTEXT_DEPENDENT_SHAPE_REPRESENTATION(#64,#62);
#64=(REPRESENTATION_RELATIONSHIP('','',#36,#6)REPRESENTATION_RELATIONSHIP_WITH_TRANSFORMATION(#55)SHAPE_REPRESENTATION_RELATIONSHIP());
#70=MECHANICAL_DESIGN_GEOMETRIC_PRESENTATION_REPRESENTATION('',(#71,
#72,#74,#75),#102);
#71=STYLED_ITEM('',(#73),#18);
#72=STYLED_ITEM('',(#73),#38);
#74=CONTEXT_DEPENDENT_OVER_RIDING_STYLED_ITEM('',(#73),#18,#71,
(#51));
#75=CONTEXT_DEPENDENT_OVER_RIDING_STYLED_ITEM('',(#73),#38,#72,(#61));
#73=PRESENTATION_STYLE_ASSIGNMENT(());
#100=PRODUCT_CONTEXT('',#103,'mechanical');
#101=PRODUCT_DEFINITION_CONTEXT('part definition',#103,'design');
#102=GEOMETRIC_REPRESENTATION_CONTEXT(3);
#103=APPLICATION_CONTEXT('automotive design');
ENDSEC;
END-ISO-10303-21;
`;

const ids = (text) => new Set([...text.matchAll(/^#(\d+)=/gm)].map((m) => Number(m[1])));

describe("pruneStep", () => {
  const out = pruneStep(step, (id) => /screw/i.test(id));
  const kept = ids(out.text);

  it("丟掉的零件連同它的幾何、組裝關係都不見", () => {
    expect(out.dropped).toEqual(["BN 123 screw M3"]);
    for (const id of [31, 33, 36, 37, 38, 40, 41, 61, 63, 64]) expect(kept.has(id)).toBe(false);
  });

  it("留下的零件: 形狀、透過關係實體連到的實體幾何、組裝關係和位置都在", () => {
    expect(out.kept.sort()).toEqual(["ASM", "BODY"]);
    for (const id of [1, 3, 5, 6, 11, 13, 15, 16, 17, 18, 20, 21, 51, 53, 54, 55, 102, 103]) expect(kept.has(id)).toBe(true);
  });

  it("顏色清單只列留下來的幾何的樣式 (含組件裡覆蓋顏色的, 組裝路徑也要還在)", () => {
    expect(out.text).toMatch(/#70=MECHANICAL_DESIGN_GEOMETRIC_PRESENTATION_REPRESENTATION\('',\(#71,#74\),#102\);/);
    expect(kept.has(71)).toBe(true);
    expect(kept.has(74)).toBe(true);
    expect(kept.has(72)).toBe(false);
    expect(kept.has(75)).toBe(false);
  });

  it("輸出還是完整的 STEP (檔頭、DATA、結尾)", () => {
    expect(out.text.startsWith("ISO-10303-21;")).toBe(true);
    expect(out.text.trimEnd().endsWith("ENDSEC;\nEND-ISO-10303-21;")).toBe(true);
    // 字串裡的分號、跳脫的單引號不會切壞實體
    expect(out.text).toContain("#18=MANIFOLD_SOLID_BREP('body; with a ''quote''',#19);");
  });
});
