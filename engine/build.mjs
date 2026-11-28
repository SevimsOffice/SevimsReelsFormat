#!/usr/bin/env node
// Reel engine v2: storyboard (word anchors) + words.json + palette -> edl.json + HyperFrames project.
// Usage: node engine/build.mjs <job_dir>      (job_dir holds storyboard.json, words.json, assets/)
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ENGINE = dirname(fileURLToPath(import.meta.url));
const JOB = resolve(process.argv[2] ?? ".");
const sb = JSON.parse(readFileSync(join(JOB, "storyboard.json"), "utf8"));
// Segments: stitch several takes (e.g. hook + reusable intro + body) into one timeline.
// Each segment: {avatar, voice, words, from, to}; paths relative to the job dir. Word ids are re-numbered
// in timeline order and written to words.timeline.json so storyboard anchors can reference them.
let words;
const SEG = [];
if (sb.segments) {
  words = []; let t0 = 0;
  for (const [k, s] of sb.segments.entries()) {
    const ws = JSON.parse(readFileSync(join(JOB, s.words), "utf8")).words.filter((w) => w.w && w.start >= s.from - 0.01 && w.end <= s.to + 0.05);
    for (const w of ws) words.push({ i: words.length, w: w.w, start: Math.round((w.start - s.from + t0) * 1000) / 1000, end: Math.round((w.end - s.from + t0) * 1000) / 1000, seg: k });
    SEG.push({ ...s, k, at: Math.round(t0 * 1000) / 1000, len: Math.round((s.to - s.from) * 1000) / 1000 });
    t0 += s.to - s.from;
  }
  writeFileSync(join(JOB, "words.timeline.json"), JSON.stringify({ words }, null, 1));
} else words = JSON.parse(readFileSync(join(JOB, sb.words_file), "utf8")).words;
const pal = JSON.parse(readFileSync(resolve(JOB, sb.palette), "utf8")).colors;
const C = Object.fromEntries(Object.entries(pal).map(([k, v]) => [k, v.hex]));
const W = 1080, H = 1920, FPS = 30;
const r3 = (x) => Math.round(x * 1000) / 1000;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const speechEnd = words.at(-1).end;
let D = r3(speechEnd + 0.35 + (sb.tail_hold_sec ?? 0));
// Never outlast the avatar footage: the speaker must not vanish before the last frame.
if (SEG.length) D = r3(Math.min(D, SEG.at(-1).at + SEG.at(-1).len));
else if (sb.avatar?.kind === "video") {
  const avDur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(JOB, "assets", "avatar.webm")]).toString());
  D = r3(Math.min(D, avDur - 0.05));
}

// ---------- anchors ----------
const byId = new Map(words.map((w) => [w.i, w]));
function at(a) {
  if (a === "end") return D;
  if (typeof a === "number") return a;
  const w = byId.get(a.w);
  if (!w) throw new Error(`no word ${a.w}`);
  return r3(Math.max(0, (a.e === "end" ? w.end : w.start) + (a.o ?? 0)));
}
const isAnchor = (v) => v === "end" || (v && typeof v === "object" && !Array.isArray(v) && typeof v.w === "number");
function resolveDeep(v) {
  if (isAnchor(v)) return at(v);
  if (Array.isArray(v)) return v.map(resolveDeep);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolveDeep(x)]));
  return v;
}
const events = sb.events.map(resolveDeep);
// UI strings: English defaults, overridable per job via storyboard.labels (e.g. Turkish).
const T = (k, d) => esc((sb.labels ?? {})[k] ?? d);
const camera = sb.camera.map(resolveDeep);

// ---------- captions: auto groups (max N words, break on punctuation / pause / off-windows) ----------
const off = sb.captions.off ?? [];
const isOff = (id) => off.some(([a, b]) => id >= a && id <= b);
const groups = [];
let cur = [];
for (const w of words) {
  if (isOff(w.i)) { if (cur.length) groups.push(cur); cur = []; continue; }
  const prev = cur.at(-1);
  if (prev && (w.start - prev.end > 0.15 || /[.,?!]$/.test(prev.w) || cur.length >= sb.captions.max_words)) { groups.push(cur); cur = []; }
  cur.push(w);
}
if (cur.length) groups.push(cur);
for (const g of groups) for (let k = g.length - 1; k >= 0; k--) if (!g[k].w) g.splice(k, 1);
const captions = groups.filter((g) => g.length).map((g, i, all) => {
  const next = all[i + 1];
  const start = r3(Math.max(0.1, g[0].start - 0.06));
  const end = r3(next ? Math.min(g.at(-1).end + 0.3, next[0].start - 0.06) : D - 0.05);
  return { id: `cap${i}`, start, end, words: g.map((w) => ({ text: w.w, start: r3(w.start), end: r3(w.end) })) };
});

const sfx = events.flatMap((e) => (e.sfx ?? []).map(([name, t]) => ({ name, t: r3(t), ev: e.id })));
const edl = { video_id: sb.video_id, duration: D, fps: FPS, camera, events, captions, sfx };
writeFileSync(join(JOB, "edl.json"), JSON.stringify(edl, null, 1));

// ---------- HyperFrames project ----------
const OUT = join(JOB, "reel");
mkdirSync(join(OUT, "compositions"), { recursive: true });
mkdirSync(join(OUT, "assets"), { recursive: true });
for (const f of ["avatar.png", "avatar.webm", "voice.wav"]) if (existsSync(join(JOB, "assets", f))) cpSync(join(JOB, "assets", f), join(OUT, "assets", f));
cpSync(join(ENGINE, "sfx"), join(OUT, "assets", "sfx"), { recursive: true });
cpSync(join(ENGINE, "assets"), join(OUT, "assets", "brand"), { recursive: true });
if (existsSync(join(JOB, "assets", "broll"))) cpSync(join(JOB, "assets", "broll"), join(OUT, "assets", "broll"), { recursive: true });

const FACE = [540, 1150];
const SAFE = { x0: 120, x1: 888, y0: 288, y1: 1248 };
const SW = SAFE.x1 - SAFE.x0;
const GY = 300; // graphics zone top
const FONT = { display: "'Playfair Display', serif", serif: "'EB Garamond', serif", mono: "'IBM Plex Mono', monospace" };

function scene(id, css, body, js) {
  return `<template>
  <style>
    #root { position: absolute; inset: 0; pointer-events: none; font-family: ${FONT.serif}; color: ${C.vintage_cream}; }
${css}
  </style>
  <div id="root" data-composition-id="${id}" data-width="${W}" data-height="${H}">
${body}
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
${js}
    window.__timelines["${id}"] = tl;
  </script>
</template>
`;
}
// Standard in/out for a whole scene wrapper.
const enter = (sel, t = 0) => `    tl.fromTo("${sel}", { opacity: 0, y: 28, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.38, ease: "expo.out" }, ${r3(t)});\n`;
const leave = (sel, len) => `    tl.to("${sel}", { opacity: 0, filter: "blur(10px)", duration: 0.2, ease: "power2.in" }, ${r3(len - 0.21)});\n`;
const pop = (sel, t, from = 0.7) => `    tl.fromTo("${sel}", { scale: ${from} }, { scale: 1, duration: 0.3, ease: "back.out(1.7)" }, ${r3(t)});\n    tl.fromTo("${sel}", { opacity: 0 }, { opacity: 1, duration: 0.14, ease: "power2.out" }, ${r3(t)});\n`;
const panel = `background: ${C.midnight_ink}E6; border: 1.5px solid ${C.vintage_cream}33; border-radius: 22px; box-shadow: 0 30px 80px rgba(0,0,0,.55);`;

const FX = {
  "title.hook"(e, L, len) {
    const lines = e.lines.map((l, i) => `<div class="hk-line" id="hook-l${i}">${l.split(" ").map((w) => `<span class="${w.replace(/\W/g, "").toLowerCase() === e.accent_word ? "acc" : ""}">${esc(w)}</span>`).join(" ")}</div>`).join("");
    const css = `    #hook-wrap { position: absolute; left: ${SAFE.x0}px; width: ${SW}px; top: 430px; text-align: center; }
    #hook-ph { position: absolute; left: ${SAFE.x0 - 20}px; width: ${SW + 40}px; top: ${GY - 20}px; height: 520px; border-radius: 22px; overflow: hidden; }
    #hook-img { width: 100%; height: 100%; object-fit: cover; filter: brightness(.55) saturate(.8); transform-origin: 50% 50%; }
    .hk-line { font-family: ${FONT.display}; font-weight: 900; font-size: 104px; line-height: 1.02; letter-spacing: -0.02em; text-shadow: 0 8px 40px rgba(0,0,0,.6); }
    .hk-line .acc { color: ${C.crimson_rouge}; font-style: italic; }
    #hook-rule { width: 120px; height: 4px; background: ${C.crimson_rouge}; margin: 26px auto 0; }`;
    const photo = e.bg_photo ? `<div id="hook-ph" class="clip" data-start="0" data-duration="${len}"><img id="hook-img" src="assets/broll/${e.bg_photo}" alt=""></div>` : "";
    const body = `    ${photo}<div id="hook-wrap" class="clip" data-start="0" data-duration="${len}">${lines}<div id="hook-rule"></div></div>`;
    // Frame 0 already shows the title (thumbnail); it only settles slightly.
    let js = `    tl.fromTo("#hook-wrap", { scale: 1.04 }, { scale: 1, duration: 0.6, ease: "expo.out" }, 0);\n`;
    if (e.bg_photo) js += `    tl.fromTo("#hook-img", { scale: 1.0 }, { scale: 1.12, duration: ${r3(len)}, ease: "none" }, 0);\n    tl.to("#hook-ph", { opacity: 0, duration: 0.2 }, ${r3(len - 0.21)});\n`;
    js += `    tl.fromTo("#hook-rule", { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "power3.out" }, 0.15);\n`;
    js += leave("#hook-wrap", len);
    return [css, body, js];
  },

  "card.counter"(e, L, len) {
    const css = `    #pl-card { position: absolute; left: ${SAFE.x0}px; width: ${SW}px; top: ${GY}px; padding: 34px 40px 30px; ${panel} }
    #pl-kicker { font-family: ${FONT.mono}; font-size: 28px; letter-spacing: .16em; color: ${C.vintage_cream}B3; }
    #pl-title { font-family: ${FONT.display}; font-weight: 900; font-size: 60px; line-height: 1.05; margin-top: 12px; }
    #pl-row { display: flex; align-items: baseline; gap: 20px; margin-top: 18px; }
    #pl-num { font-family: ${FONT.display}; font-weight: 900; font-size: 150px; line-height: .9; color: ${C.crimson_rouge}; width: 190px; }
    #pl-unit { font-style: italic; font-size: 48px; color: ${C.vintage_cream}; }`;
    const body = `    <div id="pl-card" class="clip" data-start="0" data-duration="${len}">
      <div id="pl-kicker">${e.logo ? `<img src="assets/brand/logos/${e.logo}" alt="" style="height:30px;vertical-align:-6px;margin-right:12px">` : ""}${esc(e.kicker)}</div>
      <div id="pl-title">${esc(e.title)}</div>
      <div id="pl-row"><div id="pl-num">${e.number}</div><div id="pl-unit">${esc(e.unit)}</div></div>
    </div>`;
    const counter = `    const n = { v: 0 }; const el = document.getElementById("pl-num");
    tl.fromTo(n, { v: 0 }, { v: ${e.number}, duration: 0.55, ease: "power2.out", onUpdate: () => { el.textContent = Math.round(n.v); } }, ${r3(L(e.number_at))});
    tl.set(n, { v: 0, onUpdate: () => { el.textContent = Math.round(n.v); } }, 0);\n`;
    let js = enter("#pl-card");
    js += `    tl.fromTo("#pl-title", { opacity: 0.15, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.2, ease: "power2.out" }, ${r3(L(e.title_at))});\n`;
    js += `    tl.fromTo("#pl-row", { opacity: 0 }, { opacity: 1, duration: 0.12 }, ${r3(L(e.number_at) - 0.05)});\n`;
    js += counter + leave("#pl-card", len);
    return [css, body, js];
  },

  "doc.ncr"(e, L, len) {
    const css = `    #nc-bg { position: absolute; inset: 0; background: ${C.cobalt_night}; }
    #nc-paper { position: absolute; left: 100px; top: 290px; width: 800px; height: 840px; background: ${C.vintage_cream}; color: ${C.midnight_ink};
                border-radius: 6px; box-shadow: 0 40px 120px rgba(0,0,0,.6); padding: 44px 52px; transform-origin: 50% 30%; }
    #nc-top { display: flex; justify-content: space-between; font-family: ${FONT.mono}; font-size: 28px; letter-spacing: .12em; color: ${C.crimson_rouge}; border-bottom: 2px solid ${C.midnight_ink}; padding-bottom: 16px; }
    #nc-h { font-family: ${FONT.display}; font-weight: 900; font-size: 54px; line-height: 1.05; margin: 26px 0 16px; }
    .nc-row { display: flex; gap: 22px; font-size: 34px; padding: 14px 0; border-bottom: 1px solid ${C.tweed_grey}66; }
    .nc-row b { font-family: ${FONT.mono}; font-size: 28px; letter-spacing: .08em; color: ${C.espresso_wood}; width: 150px; padding-top: 6px; font-weight: 500; flex: none; }
    .nc-row .ok { color: ${C.crimson_rouge}; font-weight: 700; }
    #nc-ct { font-style: italic; font-size: 38px; margin-top: 22px; color: ${C.espresso_wood}; }
    .nc-c { font-size: 42px; padding: 6px 0; display: flex; gap: 22px; }
    .nc-c i { font-family: ${FONT.display}; font-style: normal; font-weight: 900; color: ${C.crimson_rouge}; width: 40px; }
    .stamp { display: inline-block; border: 6px solid ${C.crimson_rouge}; color: ${C.crimson_rouge}; font-family: ${FONT.mono}; font-weight: 700;
             letter-spacing: .12em; padding: 12px 24px; border-radius: 8px; mix-blend-mode: multiply; }
    #nc-s1 { font-size: 34px; margin-bottom: 10px; }
    #nc-s2 { position: absolute; right: 50px; bottom: 70px; font-size: 44px; transform: rotate(-4deg); }`;
    const rows = e.rows.map((r, i) => `<div class="nc-row" id="nc-r${i}"><b>${esc(r.label.toUpperCase())}</b><span><span class="ok">✓</span> ${esc(r.value)}</span></div>`).join("");
    const causes = e.causes.map((c, i) => `<div class="nc-c" id="nc-c${i}"><i>${i + 1}</i>${esc(c)}</div>`).join("");
    const body = `    <div id="nc-wrap" class="clip" data-start="0" data-duration="${len}">
      <div id="nc-bg"></div>
      <div id="nc-paper">
        <div id="nc-top"><span>${esc(e.ref)}</span><span>${T("quality", "QUALITY")}</span></div>
        <div id="nc-h">${esc(e.header)}</div>
        <div class="stamp" id="nc-s1">${esc(e.stamp.text)}</div>
        ${rows}
        <div id="nc-ct">${esc(e.causes_title)}</div>
        ${causes}
        <div class="stamp" id="nc-s2">${esc(e.stamp2.text)}</div>
      </div>
    </div>`;
    let js = `    tl.fromTo("#nc-bg", { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.inOut" }, 0);
    tl.fromTo("#nc-paper", { y: 260, rotation: 3, opacity: 0 }, { y: 0, rotation: 0, opacity: 1, duration: 0.55, ease: "expo.out" }, 0.05);
    tl.fromTo("#nc-paper", { scale: 1 }, { scale: 1.05, duration: ${r3(len - 0.9)}, ease: "none" }, 0.6);\n`;
    const stampIn = (sel, t, rot) => `    tl.fromTo("${sel}", { opacity: 0, scale: 1.8, rotation: ${rot} }, { opacity: 1, scale: 1, rotation: ${rot}, duration: 0.16, ease: "power4.in" }, ${r3(t)});\n`;
    js += stampIn("#nc-s1", L(e.stamp.at), -7);
    e.rows.forEach((r, i) => { js += `    tl.fromTo("#nc-r${i}", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.3, ease: "expo.out" }, ${r3(L(r.at))});\n`; });
    js += `    tl.fromTo("#nc-ct", { opacity: 0 }, { opacity: 1, duration: 0.2 }, ${r3(L(e.causes_at) - 0.1)});\n`;
    e.causes.forEach((_, i) => { js += `    tl.fromTo("#nc-c${i}", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.28, ease: "expo.out" }, ${r3(L(e.causes_at) + 0.12 * i)});\n`; });
    js += stampIn("#nc-s2", L(e.stamp2.at), 5);
    js += `    tl.to("#nc-paper", { opacity: 0, scale: 1.15, filter: "blur(14px)", duration: 0.25, ease: "power2.in" }, ${r3(len - 0.26)});
    tl.to("#nc-bg", { opacity: 0, duration: 0.25, ease: "power2.in" }, ${r3(len - 0.26)});\n`;
    return [css, body, js];
  },

  "card.signature"(e, L, len) {
    const css = `    #sg-card { position: absolute; left: ${SAFE.x0 + 84}px; width: ${SW - 168}px; top: ${GY + 40}px; padding: 30px 40px; ${panel} }
    #sg-label { font-family: ${FONT.mono}; font-size: 28px; letter-spacing: .14em; color: ${C.vintage_cream}B3; }
    #sg-line { font-style: italic; font-size: 46px; margin-top: 8px; }
    #sg-svg { display: block; width: 100%; height: 120px; margin-top: 6px; }
    #sg-base { height: 2px; background: ${C.vintage_cream}66; }`;
    const body = `    <div id="sg-card" class="clip" data-start="0" data-duration="${len}">
      <div id="sg-label">${esc(e.label.toUpperCase())}</div>
      <div id="sg-line">${esc(e.line)}</div>
      <svg id="sg-svg" viewBox="0 0 520 120"><path id="sg-path" d="M20 80 C 60 20, 90 110, 130 60 S 190 30, 210 85 S 270 40, 300 70 S 360 95, 400 50 L 500 45" fill="none" stroke="${C.crimson_rouge}" stroke-width="5" stroke-linecap="round" stroke-dasharray="700" stroke-dashoffset="700"/></svg>
      <div id="sg-base"></div>
    </div>`;
    let js = enter("#sg-card");
    js += `    tl.fromTo("#sg-path", { attr: { "stroke-dashoffset": 700 } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.55, ease: "power1.inOut" }, ${r3(L(e.sign_at) - 0.05)});\n`;
    js += leave("#sg-card", len);
    return [css, body, js];
  },

  "card.rfq"(e, L, len) {
    const css = `    #rq-wrap { position: absolute; left: ${SAFE.x0}px; width: ${SW}px; top: ${GY - 10}px; }
    #rq-card { position: relative; padding: 26px 30px 24px; ${panel} }
    #rq-kicker { font-family: ${FONT.mono}; font-size: 28px; letter-spacing: .16em; color: ${C.vintage_cream}B3; }
    #rq-draw { display: block; width: 100%; height: 230px; margin-top: 10px; }
    .rq-flag { position: absolute; font-family: ${FONT.mono}; font-size: 30px; font-weight: 700; color: ${C.vintage_cream}; background: ${C.crimson_rouge};
               padding: 6px 14px; border-radius: 6px; }
    #rq-f0 { left: 380px; top: 72px; } #rq-f1 { left: 470px; top: 218px; }
    #rq-quote { margin-top: 18px; display: flex; justify-content: space-between; align-items: center; padding: 18px 28px; ${panel} border-color: ${C.crimson_rouge}; }
    #rq-q { font-family: ${FONT.display}; font-weight: 900; font-size: 46px; }
    #rq-bars { display: flex; align-items: flex-end; gap: 8px; height: 60px; }
    #rq-bars i { display: block; width: 16px; background: ${C.tweed_grey}; transform-origin: bottom; }
    #rq-bars i:last-child { background: ${C.crimson_rouge}; }`;
    const ink = C.vintage_cream;
    const draw = `<svg id="rq-draw" viewBox="0 0 700 230" fill="none" stroke="${ink}" stroke-width="2.5">
        <rect id="rq-d0" x="40" y="40" width="300" height="150" rx="6" stroke-dasharray="900" stroke-dashoffset="900"/>
        <circle id="rq-d1" cx="190" cy="115" r="42" stroke-dasharray="270" stroke-dashoffset="270"/>
        <path id="rq-d2" d="M40 215 H340 M40 207 V223 M340 207 V223" stroke-dasharray="340" stroke-dashoffset="340" stroke-opacity=".6"/>
        <rect id="rq-d3" x="420" y="70" width="230" height="90" rx="4" stroke-dasharray="640" stroke-dashoffset="640"/>
        <path id="rq-d4" d="M420 115 H650" stroke-dasharray="230" stroke-dashoffset="230" stroke-opacity=".5"/>
      </svg>`;
    const flags = e.flags.map((f, i) => `<div class="rq-flag" id="rq-f${i}">${esc(f.text)}</div>`).join("");
    const bars = [38, 52, 30, 46, 58].map((h, i) => `<i id="rq-b${i}" style="height:${h}px"></i>`).join("");
    const body = `    <div id="rq-wrap" class="clip" data-start="0" data-duration="${len}">
      <div id="rq-card"><div id="rq-kicker">${esc(e.kicker)}</div>${draw}${flags}</div>
      <div id="rq-quote"><div id="rq-q">${esc(e.quote)}</div><div id="rq-bars">${bars}</div></div>
    </div>`;
    let js = enter("#rq-card");
    [900, 270, 340, 640, 230].forEach((n, i) => { js += `    tl.fromTo("#rq-d${i}", { attr: { "stroke-dashoffset": ${n} } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.5, ease: "power2.out" }, ${r3(0.15 + i * 0.08)});\n`; });
    e.flags.forEach((f, i) => { js += pop(`#rq-f${i}`, L(f.at), 0.6); });
    js += enter("#rq-quote", L(e.quote_at));
    [0, 1, 2, 3, 4].forEach((i) => { js += `    tl.fromTo("#rq-b${i}", { scaleY: 0 }, { scaleY: 1, duration: 0.3, ease: "expo.out" }, ${r3(L(e.history_at) - 0.6 + i * 0.06)});\n`; });
    js += leave("#rq-wrap", len);
    return [css, body, js];
  },

  "chips.connectors"(e, L, len) {
    const css = `    #cn-wrap { position: absolute; left: ${SAFE.x0}px; width: ${SW}px; top: ${GY + 10}px; text-align: center; }
    #cn-kicker { font-family: ${FONT.mono}; font-size: 30px; letter-spacing: .2em; color: ${C.vintage_cream}B3; margin-bottom: 26px; }
    #cn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .cn-chip { padding: 26px 10px; font-family: ${FONT.display}; font-weight: 700; font-size: 42px; ${panel} border-radius: 16px; }
    .cn-chip::before { content: ""; display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${C.crimson_rouge}; margin-right: 14px; vertical-align: middle; }`;
    const chips = e.chips.map((c, i) => `<div class="cn-chip" id="cn-c${i}">${esc(c.text)}</div>`).join("");
    const body = `    <div id="cn-wrap" class="clip" data-start="0" data-duration="${len}"><div id="cn-kicker">${esc(e.kicker)}</div><div id="cn-grid">${chips}</div></div>`;
    let js = `    tl.fromTo("#cn-kicker", { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0);\n`;
    e.chips.forEach((c, i) => { js += pop(`#cn-c${i}`, L(c.at), 0.8); });
    js += leave("#cn-wrap", len);
    return [css, body, js];
  },

  "text.strike_affirm"(e, L, len) {
    const css = `    #sa-wrap { position: absolute; left: ${SAFE.x0}px; width: ${SW}px; top: ${GY + 30}px; text-align: center; }
    #sa-strike { position: relative; display: inline-block; font-family: ${FONT.display}; font-weight: 900; font-size: 84px; color: ${C.tweed_grey}; }
    #sa-line { position: absolute; left: -10px; right: -10px; top: 54%; height: 9px; background: ${C.crimson_rouge}; transform-origin: left; }
    #sa-aff { font-style: italic; font-size: 74px; margin-top: 30px; }
    #sa-aff span { color: ${C.crimson_rouge}; font-style: normal; font-family: ${FONT.display}; font-weight: 900; }`;
    const body = `    <div id="sa-wrap" class="clip" data-start="0" data-duration="${len}">
      <div id="sa-strike">${esc(e.strike)}<div id="sa-line"></div></div>
      <div id="sa-aff"><span>✓</span> ${esc(e.affirm)}</div>
    </div>`;
    let js = enter("#sa-strike");
    js += `    tl.fromTo("#sa-line", { scaleX: 0 }, { scaleX: 1, duration: 0.22, ease: "power3.out" }, ${r3(L(e.strike_at))});\n`;
    js += enter("#sa-aff", L(e.affirm_at));
    js += leave("#sa-wrap", len);
    return [css, body, js];
  },

  "doc.skillmd"(e, L, len) {
    const css = `    #sk-bg { position: absolute; inset: 0; background: ${C.cobalt_night}; }
    #sk-paper { position: absolute; left: 100px; top: 300px; width: 800px; height: 830px; background: ${C.vintage_cream}; color: ${C.midnight_ink};
                border-radius: 6px; box-shadow: 0 40px 120px rgba(0,0,0,.6); padding: 44px 48px; font-family: ${FONT.mono}; font-size: 30px; line-height: 1.55; }
    #sk-path { font-size: 28px; letter-spacing: .08em; color: ${C.crimson_rouge}; border-bottom: 2px solid ${C.midnight_ink}; padding-bottom: 14px; margin-bottom: 26px; }
    .sk-dim { color: ${C.tweed_grey}; }
    #sk-old { position: relative; display: inline-block; }
    #sk-oline { position: absolute; left: 0; right: 0; top: 52%; height: 5px; background: ${C.crimson_rouge}; transform-origin: left; }
    #sk-new { color: ${C.crimson_rouge}; font-weight: 700; }
    #sk-hand { font-family: ${FONT.serif}; font-style: italic; font-size: 40px; color: ${C.crimson_rouge}; margin-top: 30px; }`;
    const body = `    <div id="sk-wrap" class="clip" data-start="0" data-duration="${len}">
      <div id="sk-bg"></div>
      <div id="sk-paper">
        <div id="sk-path">${esc(e.path)}</div>
        <div class="sk-dim">---</div><div>name: ncr-report</div><div>description: Draft an NCR when a</div><div>&nbsp;&nbsp;part fails inspection.</div><div class="sk-dim">---</div>
        <div>&nbsp;</div><div># Steps</div>
        <div>1. <span id="sk-old">${esc(e.old)}<span id="sk-oline"></span></span></div>
        <div id="sk-new">&nbsp;&nbsp;&nbsp;${esc(e.new)}</div>
        <div>2. Search past NCRs for the defect.</div><div>3. Rank likely causes.</div>
        <div id="sk-hand">${T("team_procedure", "← your team's procedure")}</div>
      </div>
    </div>`;
    let js = `    tl.fromTo("#sk-bg", { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0);
    tl.fromTo("#sk-paper", { y: 240, rotation: -2, opacity: 0 }, { y: 0, rotation: 0, opacity: 1, duration: 0.55, ease: "expo.out" }, 0.05);
    tl.fromTo("#sk-oline", { scaleX: 0 }, { scaleX: 1, duration: 0.25, ease: "power3.out" }, ${r3(L(e.rewrite_at))});
    tl.fromTo("#sk-new", { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.3, ease: "expo.out" }, ${r3(L(e.rewrite_at) + 0.25)});
    tl.fromTo("#sk-hand", { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${r3(L(e.rewrite_at) + 0.55)});
    tl.to("#sk-paper", { opacity: 0, scale: 1.12, filter: "blur(14px)", duration: 0.25, ease: "power2.in" }, ${r3(len - 0.26)});
    tl.to("#sk-bg", { opacity: 0, duration: 0.25 }, ${r3(len - 0.26)});\n`;
    return [css, body, js];
  },

  "scene.factory"(e, L, len) {
    // Line-art machine shop drawn in the palette: CNC cell, conveyor of parts, gauge. One part fails (crimson X).
    const ink = C.vintage_cream, acc = C.crimson_rouge;
    const parts = [0, 1, 2, 3, 4, 5].map((i) => `<g id="fa-p${i}" transform="translate(${-120 - i * 150} 0)"><rect x="0" y="440" width="96" height="60" rx="6" fill="${C.espresso_wood}" stroke="${ink}" stroke-width="3"/><circle cx="48" cy="470" r="14" fill="none" stroke="${ink}" stroke-width="3"/></g>`).join("");
    const css = `    #fa-wrap { position: absolute; left: ${SAFE.x0 - 20}px; width: ${SW + 40}px; top: ${GY - 20}px; height: 640px; ${panel} overflow: hidden; }
    #fa-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    #fa-kicker { position: absolute; left: 34px; top: 26px; font-family: ${FONT.mono}; font-size: 28px; letter-spacing: .16em; color: ${ink}B3; }
    #fa-x { opacity: 0; }`;
    const body = `    <div id="fa-wrap" class="clip" data-start="0" data-duration="${len}" data-layout-allow-overflow>
      <svg id="fa-svg" viewBox="0 0 808 640" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <g stroke="${ink}" stroke-width="3">
          <path id="fa-m0" d="M90 120 H420 V400 H90 Z" stroke-dasharray="1300" stroke-dashoffset="1300"/>
          <path id="fa-m1" d="M120 150 H390 V300 H120 Z" stroke-dasharray="840" stroke-dashoffset="840" stroke-opacity=".7"/>
          <path id="fa-m2" d="M255 150 V230 M235 230 H275 L262 262 H248 Z" stroke-dasharray="260" stroke-dashoffset="260"/>
          <path id="fa-m3" d="M140 335 H220 M140 360 H190 M300 330 h60 v40 h-60 z" stroke-dasharray="400" stroke-dashoffset="400" stroke-opacity=".7"/>
          <path id="fa-c0" d="M20 500 H790 M20 520 H790" stroke-dasharray="1600" stroke-dashoffset="1600"/>
          <path id="fa-g0" d="M560 160 H720 V300 H560 Z M600 300 V430 M680 300 V430 M590 200 H690" stroke-dasharray="900" stroke-dashoffset="900"/>
        </g>
        <path id="fa-beam" d="M640 300 V432" stroke="${acc}" stroke-width="4" stroke-dasharray="8 8" opacity="0"/>
        <text x="572" y="250" fill="${ink}" font-family="IBM Plex Mono" font-size="28" opacity=".8">GAUGE</text>
        ${parts}
        <g id="fa-x" stroke="${acc}" stroke-width="10"><path d="M600 430 L680 510 M680 430 L600 510"/></g>
      </svg>
      <div id="fa-kicker">LINE 3 · INSPECTION</div>
    </div>`;
    let js = enter("#fa-wrap");
    [["#fa-m0", 1300], ["#fa-m1", 840], ["#fa-m2", 260], ["#fa-m3", 400], ["#fa-c0", 1600], ["#fa-g0", 900]].forEach(([s, n], i) => {
      js += `    tl.fromTo("${s}", { attr: { "stroke-dashoffset": ${n} } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.6, ease: "power2.out" }, ${r3(0.1 + i * 0.07)});\n`;
    });
    // Parts move steadily along the conveyor; the one under the gauge at the "fails" word gets the X.
    const failT = L(e.fail_at);
    [0, 1, 2, 3, 4, 5].forEach((i) => { js += `    tl.fromTo("#fa-p${i}", { x: ${-120 - i * 150} }, { x: ${-120 - i * 150 + 760}, duration: ${r3(Math.max(failT, 0.5))}, ease: "power1.out" }, 0);\n`; });
    js += `    tl.fromTo("#fa-beam", { opacity: 0 }, { opacity: 1, duration: 0.1 }, ${r3(failT - 0.3)});\n`;
    js += `    tl.fromTo("#fa-x", { opacity: 0, scale: 1.6, transformOrigin: "640px 470px" }, { opacity: 1, scale: 1, duration: 0.18, ease: "power4.in" }, ${r3(failT)});\n`;
    js += leave("#fa-wrap", len);
    return [css, body, js];
  },

  "doc.rfq"(e, L, len) {
    const css = `    #rf-bg { position: absolute; inset: 0; background: ${C.cobalt_night}; }
    #rf-paper { position: absolute; left: 100px; top: 290px; width: 800px; height: 840px; background: ${C.vintage_cream}; color: ${C.midnight_ink};
                border-radius: 6px; box-shadow: 0 40px 120px rgba(0,0,0,.6); padding: 40px 50px; }
    #rf-top { display: flex; justify-content: space-between; font-family: ${FONT.mono}; font-size: 28px; letter-spacing: .1em; color: ${C.crimson_rouge}; border-bottom: 2px solid ${C.midnight_ink}; padding-bottom: 12px; }
    #rf-h { font-family: ${FONT.display}; font-weight: 900; font-size: 52px; margin: 18px 0 10px; }
    .rf-f { display: flex; font-size: 32px; padding: 7px 0; border-bottom: 1px solid ${C.tweed_grey}55; }
    .rf-f b { font-family: ${FONT.mono}; font-weight: 500; font-size: 28px; color: ${C.espresso_wood}; width: 230px; flex: none; padding-top: 3px; }
    .rf-miss { color: ${C.crimson_rouge}; font-weight: 700; font-style: italic; }
    #rf-draw { display: block; width: 100%; height: 190px; margin-top: 12px; }
    #rf-q { position: absolute; left: 50px; right: 50px; bottom: 40px; display: flex; justify-content: space-between; align-items: center;
            background: ${C.midnight_ink}; color: ${C.vintage_cream}; padding: 18px 26px; border-radius: 10px; }
    #rf-q b { font-family: ${FONT.display}; font-size: 40px; }
    #rf-q span { font-family: ${FONT.mono}; font-size: 28px; color: ${C.vintage_cream}C0; }
    .rf-flag { position: absolute; font-family: ${FONT.mono}; font-size: 28px; font-weight: 700; color: ${C.vintage_cream}; background: ${C.crimson_rouge}; padding: 4px 12px; border-radius: 6px; }`;
    const ink = C.midnight_ink;
    const body = `    <div id="rf-wrap" class="clip" data-start="0" data-duration="${len}">
      <div id="rf-bg"></div>
      <div id="rf-paper">
        <div id="rf-top"><span>${T("rfq_ref", "RFQ · EXAMPLE")}</span><span>${T("inbox", "INBOX")}</span></div>
        <div id="rf-h">${T("rfq_title", "REQUEST FOR QUOTATION")}</div>
        <div class="rf-f"><b>${T("part", "PART")}</b>${T("part_v", "Bracket, machined")}</div>
        <div class="rf-f"><b>${T("material", "MATERIAL")}</b>${T("material_v", "Aluminium 6061")}</div>
        <div class="rf-f"><b>${T("qty", "QUANTITY")}</b>${T("qty_v", "500 pcs")}</div>
        <div class="rf-f" id="rf-f0"><b>${T("tolerance", "TOLERANCE")}</b><span class="rf-miss">${T("missing", "missing")}</span></div>
        <div class="rf-f" id="rf-f1"><b>${T("finish", "FINISH")}</b><span class="rf-miss">${T("missing", "missing")}</span></div>
        <svg id="rf-draw" viewBox="0 0 700 190" fill="none" stroke="${ink}" stroke-width="2.5">
          <rect id="rf-d0" x="30" y="20" width="300" height="140" rx="6" stroke-dasharray="900" stroke-dashoffset="900"/>
          <circle id="rf-d1" cx="180" cy="90" r="40" stroke-dasharray="260" stroke-dashoffset="260"/>
          <path id="rf-d2" d="M30 180 H330 M400 40 H660 V140 H400 Z" stroke-dasharray="1000" stroke-dashoffset="1000" stroke-opacity=".7"/>
        </svg>
        <div id="rf-q"><b>${esc(e.quote)}</b><span>${T("from_history", "from cost history")}</span></div>
      </div>
    </div>`;
    let js = `    tl.fromTo("#rf-bg", { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0);
    tl.fromTo("#rf-paper", { y: 260, rotation: -3, opacity: 0 }, { y: 0, rotation: 0, opacity: 1, duration: 0.55, ease: "expo.out" }, 0.05);
    tl.fromTo("#rf-paper", { scale: 1 }, { scale: 1.04, duration: ${r3(len - 0.9)}, ease: "none" }, 0.6);\n`;
    [["#rf-d0", 900], ["#rf-d1", 260], ["#rf-d2", 1000]].forEach(([s, n], i) => { js += `    tl.fromTo("${s}", { attr: { "stroke-dashoffset": ${n} } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.6, ease: "power2.out" }, ${r3(0.4 + i * 0.1)});\n`; });
    e.flags.forEach((f, i) => { js += `    tl.fromTo("#rf-f${i}", { backgroundColor: "rgba(196,30,58,0)" }, { backgroundColor: "rgba(196,30,58,0.14)", duration: 0.2 }, ${r3(L(f.at))});\n`; });
    js += `    tl.fromTo("#rf-q", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35, ease: "expo.out" }, ${r3(L(e.quote_at))});\n`;
    js += `    tl.to("#rf-paper", { opacity: 0, scale: 1.12, filter: "blur(14px)", duration: 0.25, ease: "power2.in" }, ${r3(len - 0.26)});
    tl.to("#rf-bg", { opacity: 0, duration: 0.25 }, ${r3(len - 0.26)});\n`;
    return [css, body, js];
  },

  "logos.saas"(e, L, len) {
    // One card per app, swapped on its spoken name: browser frame with the real page (when we have it) + logo.
    const css = `    #ls-wrap { position: absolute; left: ${SAFE.x0}px; width: ${SW}px; top: ${GY - 10}px; height: 620px; }
    #ls-kicker { font-family: ${FONT.mono}; font-size: 30px; letter-spacing: .2em; color: ${C.vintage_cream}B3; text-align: center; margin-bottom: 16px; }
    .ls-card { position: absolute; left: 0; top: 50px; width: 100%; ${panel} padding: 0 0 22px; overflow: hidden; }
    .ls-bar { height: 40px; background: #26272F; display: flex; align-items: center; gap: 9px; padding-left: 18px; }
    .ls-bar i { width: 13px; height: 13px; border-radius: 50%; background: ${C.tweed_grey}; display: block; }
    .ls-bar span { margin-left: 16px; font-family: ${FONT.mono}; font-size: 22px; color: ${C.vintage_cream}99; }
    .ls-shot { display: block; width: 100%; height: 230px; object-fit: cover; object-position: top; }
    .ls-hero { height: 230px; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 40%, ${C.espresso_wood} 0%, ${C.midnight_ink} 75%); }
    .ls-hero img { height: 110px; }
    .ls-hero .wm { font-family: ${FONT.display}; font-weight: 900; font-size: 76px; color: ${C.vintage_cream}; letter-spacing: -0.01em; }
    .ls-foot { display: flex; align-items: center; gap: 18px; padding: 16px 26px 0; }
    .ls-foot img { height: 52px; }
    .ls-foot b { font-family: ${FONT.display}; font-size: 46px; font-weight: 900; }
    .ls-dots { position: absolute; left: 0; right: 0; top: 0px; display: none; text-align: center; }
    .ls-dots i { display: inline-block; width: 14px; height: 14px; margin: 0 7px; border-radius: 50%; background: ${C.tweed_grey}; }`;
    let cards = "", js = `    tl.fromTo("#ls-kicker", { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0);\n`;
    e.apps.forEach((a, i) => {
      const hero = a.shot ? `<img class="ls-shot" src="assets/${a.shot.startsWith("broll/") ? a.shot : "brand/shots/" + a.shot}" alt="">` : `<div class="ls-hero">${a.hero_logo ? `<img src="assets/brand/logos/${a.hero_logo}" alt="">` : ""}<div class="wm">${esc(a.wordmark ?? "")}</div></div>`;
      cards += `<div class="ls-card" id="ls-c${i}"><div class="ls-bar"><i></i><i></i><i></i><span>${esc(a.url)}</span></div>${hero}<div class="ls-foot">${a.logo ? `<img src="assets/brand/logos/${a.logo}" alt="">` : ""}<b>${esc(a.name)}</b></div></div>`;
      const t = L(a.at), next = i + 1 < e.apps.length ? L(e.apps[i + 1].at) : len;
      js += `    tl.fromTo("#ls-c${i}", { opacity: 0, y: 40, scale: 0.94, filter: "blur(8px)" }, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.32, ease: "expo.out" }, ${r3(Math.max(0, t - 0.08))});\n`;
      js += `    tl.fromTo("#ls-d${i}", { backgroundColor: "${C.tweed_grey}" }, { backgroundColor: "${C.crimson_rouge}", duration: 0.1 }, ${r3(Math.max(0, t - 0.08))});\n`;
      if (i + 1 < e.apps.length) js += `    tl.to("#ls-c${i}", { opacity: 0, y: -30, filter: "blur(8px)", duration: 0.18, ease: "power2.in" }, ${r3(next - 0.1)});\n`;
    });
    const dots = e.apps.map((_, i) => `<i id="ls-d${i}"></i>`).join("");
    const body = `    <div id="ls-wrap" class="clip" data-start="0" data-duration="${len}" data-layout-allow-overlap data-layout-allow-occlusion><div id="ls-kicker">${esc(e.kicker)}</div>${cards}<div class="ls-dots">${dots}</div></div>`;
    js += leave("#ls-wrap", len);
    return [css, body, js];
  },

  "photo.card"(e, L, len) {
    // Real photo b-roll in a framed card with a slow push; optional crimson stamp on a spoken word.
    const css = `    #ph-wrap { position: absolute; left: ${SAFE.x0 - 20}px; width: ${SW + 40}px; top: ${GY - 20}px; height: 380px; ${panel} overflow: hidden; }
    #ph-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform-origin: 50% 55%; }
    #ph-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(13,14,68,.55) 0%, rgba(26,27,34,0) 35%, rgba(26,27,34,.15) 70%, rgba(26,27,34,.75) 100%); }
    #ph-kicker { position: absolute; left: 30px; top: 26px; font-family: ${FONT.mono}; font-size: 28px; letter-spacing: .16em; color: ${C.vintage_cream}; }
    #ph-stamp { position: absolute; right: 40px; bottom: 44px; border: 6px solid ${C.crimson_rouge}; color: ${C.vintage_cream}; background: ${C.crimson_rouge}CC;
                font-family: ${FONT.mono}; font-weight: 700; font-size: 44px; letter-spacing: .12em; padding: 10px 24px; border-radius: 8px; }`;
    const body = `    <div id="ph-wrap" class="clip" data-start="0" data-duration="${len}" data-layout-allow-overflow>
      <img id="ph-img" src="assets/broll/${e.src}" alt="">
      <div id="ph-shade"></div>
      ${e.kicker ? `<div id="ph-kicker">${esc(e.kicker)}</div>` : ""}
      ${e.stamp ? `<div id="ph-stamp">${esc(e.stamp.text)}</div>` : ""}
    </div>`;
    let js = enter("#ph-wrap");
    js += `    tl.fromTo("#ph-img", { scale: 1.02 }, { scale: 1.14, duration: ${r3(len)}, ease: "none" }, 0);\n`;
    if (e.stamp) js += `    tl.fromTo("#ph-stamp", { opacity: 0, scale: 1.8, rotation: -6 }, { opacity: 1, scale: 1, rotation: -6, duration: 0.16, ease: "power4.in" }, ${r3(L(e.stamp.at))});\n`;
    js += leave("#ph-wrap", len);
    return [css, body, js];
  },

  "screen.recording"(e, L, len) {
    // User's screen recording, full frame on black, muted, time-stretched to the spoken window.
    const css = `    #sr-wrap { position: absolute; inset: 0; }
    #sr-bg { position: absolute; inset: 0; background: #000; }
    #sr-vid { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; object-fit: contain; }
    #sr-tag { position: absolute; left: ${SAFE.x0}px; top: 250px; font-family: ${FONT.mono}; font-size: 28px; letter-spacing: .16em; color: ${C.vintage_cream}; background: ${C.crimson_rouge}; padding: 6px 16px; border-radius: 6px; }`;
    const body = `    <div id="sr-wrap" data-layout-allow-occlusion>
      <div id="sr-bg"></div>
      <video id="sr-vid" class="clip" src="assets/broll/${e.src}" muted playsinline data-start="0" data-duration="${len}" data-playback-rate="${e.rate ?? 1}"></video>
      ${e.tag ? `<div id="sr-tag">${esc(e.tag)}</div>` : ""}
    </div>`;
    let js = `    tl.fromTo("#sr-bg", { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0);
    tl.fromTo("#sr-vid", { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.35, ease: "expo.out" }, 0.05);\n`;
    if (e.tag) js += `    tl.fromTo("#sr-tag", { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.25 }, 0.3);\n`;
    // Optional zooms into the recording when the UI gets small: [{at, scale, ox, oy, dur}]
    for (const z of e.zooms ?? []) js += `    tl.to("#sr-vid", { scale: ${z.scale}, transformOrigin: "${z.ox ?? 540}px ${z.oy ?? 960}px", duration: ${z.dur ?? 0.5}, ease: "power2.inOut" }, ${r3(L(z.at))});\n`;
    js += `    tl.to(["#sr-vid", "#sr-bg"], { opacity: 0, duration: 0.25, ease: "power2.in" }, ${r3(len - 0.26)});\n`;
    return [css, body, js];
  },

  "badge.episode"(e, L, len) {
    const css = `    #ep-card { position: absolute; left: ${SAFE.x0}px; width: ${SW}px; top: ${GY}px; padding: 30px 36px; ${panel} }
    #ep-k { font-family: ${FONT.mono}; font-size: 30px; letter-spacing: .18em; color: ${C.crimson_rouge}; }
    #ep-t { font-family: ${FONT.display}; font-weight: 900; font-size: 76px; line-height: 1.02; margin-top: 10px; }
    #ep-d { font-family: ${FONT.mono}; font-size: 28px; letter-spacing: .14em; color: ${C.vintage_cream}B3; margin-top: 12px; }
    #ep-name { margin-top: 22px; padding-top: 18px; border-top: 1.5px solid ${C.vintage_cream}33; font-style: italic; font-size: 42px; }
    #ep-name b { font-style: normal; font-family: ${FONT.display}; font-weight: 900; color: ${C.vintage_cream}; margin-right: 12px; }`;
    const body = `    <div id="ep-card" class="clip" data-start="0" data-duration="${len}">
      <div id="ep-k">${esc(e.kicker)}</div><div id="ep-t">${esc(e.title)}</div><div id="ep-d">${esc(e.dept)}</div>
      <div id="ep-name"><b>${esc(e.name)}</b>${esc(e.role)}</div>
    </div>`;
    let js = enter("#ep-card");
    js += `    tl.fromTo("#ep-name", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35, ease: "expo.out" }, ${r3(L(e.name_at))});\n`;
    js += leave("#ep-card", len);
    return [css, body, js];
  },

  "list.check"(e, L, len) {
    const css = `    #lc-card { position: absolute; left: ${SAFE.x0}px; width: ${SW}px; top: ${GY - 10}px; padding: 26px 34px; ${panel} }
    #lc-k { font-family: ${FONT.mono}; font-size: 28px; letter-spacing: .16em; color: ${C.vintage_cream}B3; margin-bottom: 8px; }
    .lc-i { display: flex; align-items: center; gap: 18px; font-size: 44px; padding: 7px 0; }
    .lc-i i { font-style: normal; display: inline-flex; width: 44px; height: 44px; border-radius: 50%; border: 3px solid ${C.crimson_rouge}; align-items: center; justify-content: center; color: ${C.crimson_rouge}; font-size: 28px; font-weight: 900; }`;
    const items = e.items.map((it, i) => `<div class="lc-i" id="lc-i${i}"><i>✓</i>${esc(it.text)}</div>`).join("");
    const body = `    <div id="lc-card" class="clip" data-start="0" data-duration="${len}"><div id="lc-k">${esc(e.kicker)}</div>${items}</div>`;
    let js = enter("#lc-card");
    e.items.forEach((it, i) => { js += `    tl.fromTo("#lc-i${i}", { opacity: 0.18, x: -12 }, { opacity: 1, x: 0, duration: 0.25, ease: "expo.out" }, ${r3(L(it.at))});\n`; });
    js += leave("#lc-card", len);
    return [css, body, js];
  },

  "fly.converge"(e, L, len) {
    // System chips fly in from scattered spots (deterministic), drift, then snap into one target box.
    const spots = [[-260, -140, -14], [300, -170, 10], [-300, 140, 8], [280, 160, -10], [0, -230, 4], [-40, 230, -6]];
    const cx = SAFE.x0 + SW / 2, cy = GY + 210;
    const chips = e.items.map((t, i) => `<div class="fc-chip" id="fc-c${i}">${esc(t)}</div>`).join("");
    const css = `    #fc-wrap { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }
    .fc-chip { position: absolute; left: ${cx - 120}px; top: ${cy - 34}px; width: 240px; height: 68px; border-radius: 14px; ${panel}
               display: flex; align-items: center; justify-content: center; font-family: ${FONT.mono}; font-size: 30px; letter-spacing: .06em; color: ${C.vintage_cream}; }
    #fc-box { position: absolute; left: ${cx - 230}px; top: ${cy - 70}px; width: 460px; height: 140px; border-radius: 22px; border: 3px solid ${C.crimson_rouge};
              background: ${C.midnight_ink}F0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    #fc-box b { font-family: ${FONT.display}; font-size: 54px; font-weight: 900; } #fc-box span { font-family: ${FONT.mono}; font-size: 28px; color: ${C.vintage_cream}B3; letter-spacing: .12em; }`;
    const body = `    <div id="fc-wrap" class="clip" data-start="0" data-duration="${len}" data-layout-allow-overlap data-layout-allow-overflow>${chips}<div id="fc-box"><b>${esc(e.target)}</b><span>${esc(e.target_sub ?? "")}</span></div></div>`;
    let js = "";
    const snap = L(e.snap_at);
    e.items.forEach((_, i) => {
      const [x, y, r] = spots[i % spots.length];
      js += `    tl.fromTo("#fc-c${i}", { x: ${x * 1.6}, y: ${y * 1.6 - 200}, rotation: ${r * 2}, opacity: 0 }, { x: ${x}, y: ${y}, rotation: ${r}, opacity: 1, duration: 0.5, ease: "expo.out" }, ${r3(0.08 * i)});\n`;
      js += `    tl.to("#fc-c${i}", { x: ${x * 0.85}, y: ${y * 0.85 + (i % 2 ? 10 : -10)}, duration: ${r3(Math.max(0.3, snap - 0.6 - 0.08 * i))}, ease: "sine.inOut" }, ${r3(0.5 + 0.08 * i)});\n`;
      js += `    tl.to("#fc-c${i}", { x: 0, y: 0, rotation: 0, scale: 0.4, opacity: 0, duration: 0.35, ease: "power3.in" }, ${r3(snap + 0.04 * i)});\n`;
    });
    js += `    tl.fromTo("#fc-box", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.8)" }, ${r3(snap + 0.3)});\n`;
    js += leave("#fc-wrap", len);
    return [css, body, js];
  },

  "terminal.log"(e, L, len) {
    const css = `    #tl-card { position: absolute; left: ${SAFE.x0 - 20}px; width: ${SW + 40}px; top: ${GY - 20}px; border-radius: 18px; ${panel} overflow: hidden; }
    #tl-bar { height: 44px; background: #26272F; display: flex; align-items: center; gap: 9px; padding-left: 18px; font-family: ${FONT.mono}; font-size: 22px; color: ${C.vintage_cream}99; }
    #tl-bar i { width: 13px; height: 13px; border-radius: 50%; background: ${C.tweed_grey}; display: block; } #tl-bar i:first-child { background: ${C.crimson_rouge}; }
    #tl-body { padding: 20px 26px 24px; font-family: ${FONT.mono}; font-size: 30px; line-height: 1.6; color: ${C.vintage_cream}; }
    .tl-l { opacity: 0; white-space: nowrap; } .tl-l .ok { color: #7FD18B; } .tl-l .p { color: ${C.crimson_rouge}; }
    .tl-l.fin { color: ${C.vintage_cream}; font-weight: 700; }`;
    const lines = e.lines.map((l, i) => `<div class="tl-l${l.final ? " fin" : ""}" id="tl-l${i}"><span class="p">›</span> ${esc(l.text)} ${l.final ? "" : '<span class="ok">✓</span>'}</div>`).join("");
    const body = `    <div id="tl-card" class="clip" data-start="0" data-duration="${len}"><div id="tl-bar"><i></i><i></i><i></i><span style="margin-left:14px">${esc(e.title)}</span></div><div id="tl-body">${lines}</div></div>`;
    let js = enter("#tl-card");
    e.lines.forEach((l, i) => { js += `    tl.fromTo("#tl-l${i}", { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.18, ease: "power2.out" }, ${r3(L(l.at))});\n`; });
    js += leave("#tl-card", len);
    return [css, body, js];
  },

  "table.rows"(e, L, len) {
    const css = `    #tr-card { position: absolute; left: ${SAFE.x0 - 20}px; width: ${SW + 40}px; top: ${GY - 10}px; padding: 20px 18px; ${panel} }
    #tr-k { font-family: ${FONT.mono}; font-size: 28px; letter-spacing: .14em; color: ${C.vintage_cream}B3; margin: 0 8px 12px; }
    table { width: 100%; border-collapse: collapse; font-family: ${FONT.mono}; font-size: 26px; color: ${C.vintage_cream}; }
    th { text-align: left; font-weight: 700; padding: 8px; border-bottom: 2px solid ${C.vintage_cream}55; color: ${C.vintage_cream}B3; }
    td { padding: 9px 8px; border-bottom: 1px solid ${C.vintage_cream}22; }
    .hl { background: ${C.crimson_rouge}33; color: #fff; } .bad { color: ${C.crimson_rouge}; font-weight: 700; }`;
    const head = `<tr>${e.cols.map((c, j) => `<th id="tr-h${j}">${esc(c)}</th>`).join("")}</tr>`;
    const rows = e.rows.map((r, i) => `<tr id="tr-r${i}">${r.map((v, j) => `<td class="c${j}${String(v).startsWith("!") ? " bad" : ""}">${esc(String(v).replace(/^!/, ""))}</td>`).join("")}</tr>`).join("");
    const body = `    <div id="tr-card" class="clip" data-start="0" data-duration="${len}"><div id="tr-k">${esc(e.kicker)}</div><table>${head}${rows}</table></div>`;
    let js = enter("#tr-card");
    e.rows.forEach((_, i) => { js += `    tl.fromTo("#tr-r${i}", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }, ${r3(0.3 + 0.12 * i)});\n`; });
    (e.highlight ?? []).forEach((h) => { js += `    tl.fromTo("#tr-card .c${h.col}, #tr-h${h.col}", { backgroundColor: "rgba(196,30,58,0)" }, { backgroundColor: "rgba(196,30,58,0.28)", duration: 0.18 }, ${r3(L(h.at))});\n`; });
    js += leave("#tr-card", len);
    return [css, body, js];
  },

  "float.tiles"(e, L, len) {
    // Spreadsheet tiles hang in the air, drifting; on strike_at each one gets crossed and falls away.
    const pos = [[150, 330, -8], [560, 300, 6], [330, 470, 3], [130, 600, 7], [600, 580, -5]];
    const tiles = e.items.map((t, i) => {
      const [x, y] = pos[i % pos.length];
      return `<div class="ft-t" id="ft-t${i}" style="left:${x}px;top:${y}px"><div class="ft-g"></div><span>${esc(t)}</span><div class="ft-x" id="ft-x${i}"></div></div>`;
    }).join("");
    const css = `    #ft-wrap { position: absolute; inset: 0; }
    .ft-t { position: absolute; width: 330px; height: 150px; border-radius: 12px; background: ${C.vintage_cream}; color: ${C.midnight_ink}; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,.5); }
    .ft-g { position: absolute; inset: 38px 0 0 0; background-image: linear-gradient(${C.tweed_grey}55 1px, transparent 1px), linear-gradient(90deg, ${C.tweed_grey}55 1px, transparent 1px); background-size: 55px 28px; }
    .ft-t span { position: absolute; left: 0; right: 0; top: 0; height: 38px; background: #2E7D4F; color: #fff; font-family: ${FONT.mono}; font-size: 24px; padding: 5px 12px; }
    .ft-x { position: absolute; left: -10px; right: -10px; top: 50%; height: 8px; background: ${C.crimson_rouge}; transform-origin: left; transform: rotate(-12deg) scaleX(0); }`;
    const body = `    <div id="ft-wrap" class="clip" data-start="0" data-duration="${len}" data-layout-allow-overlap data-layout-allow-overflow>${tiles}</div>`;
    let js = "";
    const st = L(e.strike_at);
    e.items.forEach((_, i) => {
      const r = pos[i % pos.length][2];
      js += `    tl.fromTo("#ft-t${i}", { opacity: 0, y: 120, rotation: ${r * 2}, scale: 0.8 }, { opacity: 1, y: 0, rotation: ${r}, scale: 1, duration: 0.5, ease: "expo.out" }, ${r3(0.1 * i)});\n`;
      js += `    tl.to("#ft-t${i}", { y: ${i % 2 ? -18 : 18}, rotation: ${-r * 0.5}, duration: ${r3(Math.max(0.3, st - 0.6 - 0.1 * i))}, ease: "sine.inOut" }, ${r3(0.5 + 0.1 * i)});\n`;
      js += `    tl.to("#ft-x${i}", { scaleX: 1, duration: 0.15, ease: "power3.out" }, ${r3(st + 0.06 * i)});\n`;
      js += `    tl.to("#ft-t${i}", { y: 900, rotation: ${r * 4}, opacity: 0, duration: 0.5, ease: "power3.in" }, ${r3(Math.min(len - 0.55, st + 0.35 + 0.06 * i))});\n`;
    });
    return [css, body, js];
  },

  "duo.roles"(e, L, len) {
    const css = `    #dr-wrap { position: absolute; left: ${SAFE.x0}px; width: ${SW}px; top: ${GY + 20}px; display: flex; gap: 22px; }
    .dr-c { flex: 1; padding: 26px 20px; ${panel} text-align: center; }
    .dr-c small { display: block; font-family: ${FONT.mono}; font-size: 28px; letter-spacing: .16em; color: ${C.vintage_cream}B3; }
    .dr-c b { display: block; font-family: ${FONT.display}; font-weight: 900; font-size: 64px; margin-top: 8px; }
    #dr-1 { border-color: ${C.crimson_rouge}; } #dr-1 b { color: ${C.crimson_rouge}; }`;
    const body = `    <div id="dr-wrap" class="clip" data-start="0" data-duration="${len}">${e.roles.map((r, i) => `<div class="dr-c" id="dr-${i}"><small>${esc(r.who)}</small><b>${esc(r.does)}</b></div>`).join("")}</div>`;
    let js = "";
    e.roles.forEach((r, i) => { js += `    tl.fromTo("#dr-${i}", { opacity: 0, y: 40, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.35, ease: "expo.out" }, ${r3(L(r.at))});\n`; });
    js += leave("#dr-wrap", len);
    return [css, body, js];
  },

  "cta.comment"(e, L, len) {
    const css = `    #ct-wrap { position: absolute; left: ${SAFE.x0}px; width: ${SW}px; top: ${GY + 40}px; text-align: center; }
    #ct-line { font-style: italic; font-size: 54px; }
    #ct-pill { display: inline-block; margin-top: 26px; padding: 18px 44px; border-radius: 60px; background: ${C.crimson_rouge}; font-family: ${FONT.display}; font-weight: 900; font-size: 72px; }
    #ct-pill small { font-family: ${FONT.serif}; font-style: italic; font-weight: 400; font-size: 44px; margin-right: 14px; }`;
    const letters = [...e.word].map((c, i) => `<span id="ct-k${i}" style="opacity:0">${esc(c)}</span>`).join("");
    const body = `    <div id="ct-wrap" class="clip" data-start="0" data-duration="${len}"><div id="ct-line">${esc(e.line)}</div><div id="ct-pill"><small>${T("comment", "Comment")}</small>${letters}</div></div>`;
    let js = enter("#ct-line") + pop("#ct-pill", 0.3, 0.8);
    [...e.word].forEach((_, i) => { js += `    tl.set("#ct-k${i}", { opacity: 1 }, ${r3(Math.max(0.35, L(e.word_at) - 0.25) + 0.06 * i)});\n`; });
    return [css, body, js];
  },
};

// Behind-subject text lives in the root (between plate and cutout), so it is not a scene.
const behind = events.filter((e) => e.fx === "text.behind_subject");
const scenes = events.filter((e) => e.fx !== "text.behind_subject");
for (const e of scenes) {
  const len = r3(e.to - e.from);
  const L = (t) => r3(t - e.from);
  if (!FX[e.fx]) throw new Error(`unknown fx ${e.fx}`);
  const [css, body, js] = FX[e.fx](e, L, len);
  writeFileSync(join(OUT, "compositions", `${e.id}.html`), scene(e.id, css, body, js));
}

// Captions: cream serif words, active word boxed in Midnight Ink, upcoming words Tweed Grey.
{
  const capTop = 700, capLow = 1162;
  const docWins = events.filter((e) => e.fx.startsWith("doc.")).map((e) => [e.from, e.to]);
  const onDoc = (c) => docWins.some(([a, z]) => c.start >= a - 0.1 && c.start < z);
  // storyboard.captions.low: [[firstWordId, lastWordId]] windows where captions sit low (e.g. over a screen recording).
  const lowWins = (sb.captions.low ?? []).map(([a, z]) => [byId.get(a).start - 0.1, byId.get(z).end + 0.1]);
  const isLow = (c) => lowWins.some(([a, z]) => c.start >= a && c.start < z);
  let body = "", js = "";
  for (const c of captions) {
    body += `    <div id="${c.id}" class="cap clip" data-start="${c.start}" data-duration="${r3(c.end - c.start)}" style="top:${isLow(c) ? (sb.captions.low_y ?? 1290) : onDoc(c) ? capLow : capTop}px">${c.words.map((w, i) => `<span id="${c.id}-w${i}" class="w">${esc(w.text)}</span>`).join("")}</div>\n`;
    js += `    tl.fromTo("#${c.id}", { opacity: 0 }, { opacity: 1, duration: 0.08 }, ${c.start});\n`;
    c.words.forEach((w, i) => {
      js += `    tl.fromTo("#${c.id}-w${i}", { color: "#9A9AA2", backgroundColor: "rgba(26,27,34,0)" }, { color: "${C.vintage_cream}", backgroundColor: "rgba(26,27,34,0.92)", duration: 0.06 }, ${Math.max(c.start, w.start)});\n`;
    });
    js += `    tl.to("#${c.id}", { opacity: 0, duration: 0.08 }, ${r3(c.end - 0.08)});\n`;
  }
  const css = `    .cap { position: absolute; left: ${SAFE.x0}px; width: ${SW}px; text-align: center; font-family: ${FONT.serif}; font-size: 58px; line-height: 1.25; overflow: visible; }
    .cap .w { display: inline-block; padding: 0 10px; margin: 0 1px; border-radius: 6px; }`;
  writeFileSync(join(OUT, "compositions", "captions.html"), scene("captions", css, body, js));
}

// SFX lanes
const SFX_LEN = { impact: 0.9, paper: 0.5, tick: 0.06, stamp: 0.35, whoosh: 0.45, pen: 0.6, slash: 0.3 };
const SFX_VOL = { impact: 0.5, paper: 0.45, tick: 0.5, stamp: 0.55, whoosh: 0.45, pen: 0.35, slash: 0.45 };
const lanes = [];
const sfxTags = sfx.map((s, i) => {
  const len = Math.min(SFX_LEN[s.name] ?? 0.5, D - s.t);
  let lane = lanes.findIndex((end) => end <= s.t);
  if (lane < 0) { lane = lanes.length; lanes.push(0); }
  lanes[lane] = s.t + len;
  return `      <audio id="sfx${i}" src="assets/sfx/${s.name}.wav" data-start="${s.t}" data-duration="${r3(len)}" data-volume="${SFX_VOL[s.name] ?? 0.5}" data-track-index="${6 + lane}"></audio>`;
}).join("\n");

const camJs = [`      tl.set("#cam", { scale: 1, transformOrigin: "${FACE[0]}px ${FACE[1]}px" }, 0);`, `      tl.set("#bgcam", { scale: 1, transformOrigin: "${FACE[0]}px ${FACE[1]}px" }, 0);`];
for (const c of camera) {
  const bg = r3(1 + (c.scale - 1) * 0.35);
  const xy = `, x: ${c.x ?? 0}, y: ${c.y ?? 0}`; // x/y let the speaker shrink into a corner (picture-in-picture)
  if (c.type === "cut") camJs.push(`      tl.set("#cam", { scale: ${c.scale}${xy} }, ${c.at});`, `      tl.set("#bgcam", { scale: ${bg} }, ${c.at});`);
  else camJs.push(`      tl.to("#cam", { scale: ${c.scale}${xy}, duration: ${c.dur}, ease: "power2.inOut" }, ${c.at});`, `      tl.to("#bgcam", { scale: ${bg}, duration: ${c.dur}, ease: "power2.inOut" }, ${c.at});`);
}
let behindHtml = "";
for (const b of behind) {
  const len = r3(b.to - b.from);
  behindHtml += `        <div id="bh-${b.id}" class="clip bh" data-start="${b.from}" data-duration="${len}" data-layout-allow-overlap><div id="bh-${b.id}-t" class="bh-t">${esc(b.text)}</div></div>\n`;
  camJs.push(`      tl.fromTo("#bh-${b.id}-t", { opacity: 0, y: 80, filter: "blur(12px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.45, ease: "expo.out" }, ${b.at});`);
  camJs.push(`      tl.to("#bh-${b.id}-t", { opacity: 0, filter: "blur(10px)", duration: 0.2, ease: "power2.in" }, ${r3(b.to - 0.21)});`);
}
const av = sb.avatar;
const avatarTag0 = 0;
const segName = (p) => p.replace(/[^a-zA-Z0-9.]+/g, "_").replace(/^_+/, "");
for (const s of SEG) { cpSync(join(JOB, s.avatar), join(OUT, "assets", segName(s.avatar))); cpSync(join(JOB, s.voice), join(OUT, "assets", segName(s.voice))); }
const avatarTag = SEG.length
  ? SEG.map((s) => `<video id="avatar${s.k}" class="clip av" src="assets/${segName(s.avatar)}" muted playsinline data-start="${s.at}" data-media-start="${s.from}" data-duration="${r3(Math.min(s.len, D - s.at))}" data-track-index="0" data-layout-allow-occlusion></video>`).join("\n        ")
  : av.kind === "video"
  ? `<video id="avatar" class="clip" src="assets/avatar.webm" muted playsinline data-start="0" data-duration="${r3(Math.min(D, parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(JOB, "assets", "avatar.webm")]).toString())))}" data-track-index="0" data-layout-allow-occlusion></video>`
  : `<img id="avatar" class="clip" src="assets/avatar.png" alt="" data-start="0" data-duration="${D}" data-track-index="0" data-layout-allow-occlusion />`;
const hosts = scenes.map((e) => `      <div id="${e.id}" data-composition-id="${e.id}" data-composition-src="compositions/${e.id}.html" data-start="${e.from}" data-duration="${r3(e.to - e.from)}" data-track-index="${e.fx.startsWith("doc.") ? 3 : 2}" data-track-kind="graphics" data-width="${W}" data-height="${H}" style="z-index:${e.fx.startsWith("doc.") ? 7 : e.fx === "screen.recording" ? 2 : 5}"></div>`).join("\n");

const index = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <!-- GENERATED by engine/build.mjs from ${sb.video_id}/storyboard.json. Edit the storyboard, not this file. -->
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: ${C.midnight_ink}; }
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; }
      #ground { position: absolute; inset: 0; background:
        radial-gradient(130% 75% at 50% 60%, rgba(0,0,0,0) 50%, rgba(0,0,0,.6) 100%),
        linear-gradient(180deg, ${C.cobalt_night} 0%, ${C.midnight_ink} 48%, #121218 100%); }
      #bgcam { position: absolute; inset: 0; }
      #glow { position: absolute; left: ${FACE[0] - 560}px; top: ${FACE[1] - 660}px; width: 1120px; height: 1120px; border-radius: 50%;
        background: radial-gradient(circle, ${C.espresso_wood}CC 0%, ${C.espresso_wood}55 38%, rgba(77,56,44,0) 70%); }
      #lamp { position: absolute; left: 820px; top: 520px; width: 260px; height: 260px; border-radius: 50%;
        background: radial-gradient(circle, ${C.vintage_cream}40 0%, rgba(240,235,212,0) 70%); }
      #cam { position: absolute; inset: 0; z-index: 4; }
      .bh { position: absolute; inset: 0; z-index: 2; }
      .bh-t { position: absolute; left: 0; width: 100%; top: 880px; text-align: center; font-family: 'Playfair Display', serif; font-weight: 900;
        font-size: 230px; letter-spacing: -0.03em; color: ${C.crimson_rouge}; margin-left: -36px; }
      #avatar, .av { position: absolute; left: 0; top: ${av.y ?? 0}px; width: ${W}px; height: ${H}px; object-fit: contain; z-index: 3; -webkit-mask-image: linear-gradient(180deg, #000 86%, transparent 100%); mask-image: linear-gradient(180deg, #000 86%, transparent 100%); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${D}" data-width="${W}" data-height="${H}">
      <div id="ground"></div>
      <div id="bgcam"><div id="glow"></div></div>
      <div id="cam">
${behindHtml}        ${avatarTag}
      </div>
${SEG.length ? SEG.map((s) => `      <audio id="voice${s.k}" src="assets/${segName(s.voice)}" data-start="${s.at}" data-media-start="${s.from}" data-duration="${r3(Math.min(s.len, D - s.at))}" data-volume="1" data-track-index="5"></audio>`).join("\n") : `      <audio id="voice" src="assets/voice.wav" data-start="0" data-duration="${r3(Math.min(D, parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(OUT, "assets", "voice.wav")]).toString())))}" data-volume="1" data-track-index="5"></audio>`}
${hosts}
      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${D}" data-track-index="4" data-track-kind="captions" data-width="${W}" data-height="${H}" style="z-index:8"></div>
${sfxTags}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
${camJs.join("\n")}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
writeFileSync(join(OUT, "index.html"), index);
if (!existsSync(join(OUT, "meta.json"))) writeFileSync(join(OUT, "meta.json"), JSON.stringify({ id: sb.video_id, name: sb.video_id }, null, 2));
console.log(`edl: ${events.length} events, ${captions.length} caption groups, ${sfx.length} sfx, ${D}s -> ${OUT}`);
