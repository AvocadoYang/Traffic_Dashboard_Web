// 用 --remote-debugging-pipe 驅動無頭 Chrome (不開任何連接埠)
import { spawn } from "node:child_process";
import fs from "node:fs";
const [mode, ...rest] = process.argv.slice(2);
const W = +(process.env.W || 1920), H = +(process.env.H || 1080);
const dir = new URL(".", import.meta.url).pathname;
const chrome = spawn("google-chrome", ["--headless=new", "--no-sandbox", "--remote-debugging-pipe", "--user-data-dir=" + dir + "profile",
  "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", ...(process.env.GL ? ["--use-angle=" + process.env.GL] : []), `--window-size=${W},${H}`, "about:blank"],
  { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });
let id = 0, buf = Buffer.alloc(0); const pend = new Map();
chrome.stdio[4].on("data", (d) => { buf = Buffer.concat([buf, d]); let i; while ((i = buf.indexOf(0)) >= 0) { const m = JSON.parse(buf.subarray(0, i).toString()); buf = buf.subarray(i + 1);
  if (m.id && pend.has(m.id)) { const [res, rej] = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
  else if (m.method === "Runtime.exceptionThrown") console.error("EXC", JSON.stringify(m.params.exceptionDetails).slice(0, 600));
  else if (m.method === "Runtime.consoleAPICalled") console.error("LOG", m.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 400)); } });
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { pend.set(++id, [res, rej]); chrome.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + "\0"); });
const { targetInfos } = await send("Target.getTargets");
const { sessionId } = await send("Target.attachToTarget", { targetId: targetInfos.find((t) => t.type === "page").targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S("Runtime.enable"); await S("Page.enable");
const ev = async (expression) => { const r = await S("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 800)); return r.result.value; };
await S("Page.navigate", { url: `file://${dir}index.html?w=${W}&h=${H}&mb=${process.env.MB || 5}` });
for (let i = 0; i < 100; i++) { if (await ev("!!window.HERO")) break; await new Promise((r) => setTimeout(r, 200)); }
console.log(await ev("HERO.ready()"));
console.log(await ev("(()=>{const g=document.createElement('canvas').getContext('webgl2');const e=g.getExtension('WEBGL_debug_renderer_info');return g.getParameter(e.UNMASKED_RENDERER_WEBGL)})()"));
if (process.env.CFG) await ev(`Object.assign(CFG, ${process.env.CFG})`);
if (mode === "eval") { console.log(await ev(rest[0])); }
else if (mode === "img") { for (let i = 0; i < rest.length; i += 2) fs.writeFileSync(rest[i], Buffer.from(await ev(rest[i + 1]), "base64")); }
else if (mode === "still") {
  for (const t of rest) { const t0 = Date.now(); fs.writeFileSync(`${process.cwd()}/still_${t}.jpg`, Buffer.from(await ev(`HERO.still(${t}, 0.85)`), "base64")); console.log("still", t, Date.now() - t0, "ms"); }
} else if (mode === "video") {
  const [out, fps = "30", br = "6000000"] = rest; const t0 = Date.now();
  const p = ev(`HERO.video(${fps}, ${br})`);
  const tick = setInterval(async () => console.log("frame", await ev("HERO.progress"), ((Date.now() - t0) / 1000).toFixed(0) + "s"), 20000);
  const len = await p; clearInterval(tick);
  const fd = fs.openSync(out, "w");
  for (let i = 0; i * (1 << 20) < len; i++) fs.writeSync(fd, Buffer.from(await ev(`HERO.chunk(${i})`), "base64"));
  fs.closeSync(fd); console.log("wrote", out, len, "bytes", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
chrome.kill(); process.exit(0);
