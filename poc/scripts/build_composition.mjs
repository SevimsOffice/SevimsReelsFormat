#!/usr/bin/env node
// EDL -> HyperFrames project (index.html + compositions/*.html).
// Usage: node scripts/build_composition.mjs work/edl.json reel-test
// Every time in the generated HTML comes from the EDL; nothing is hand-timed.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const [, , edlPath = "work/edl.json", outDir = "reel-test"] = process.argv;
const edl = JSON.parse(readFileSync(edlPath, "utf8"));
const { width: W, height: H } = edl.canvas;
const D = edl.duration;
const SRC = edl.source_duration ?? D;
const S = edl.style;
const FACE = edl.zones.face.anchor; // camera pivot
const GFX = edl.zones.graphics.y;
const CAP = edl.zones.captions.y;
const SAFE_X = [120, 888]; // Reels/TikTok/Shorts common safe band above y=840
const SAFE_W = SAFE_X[1] - SAFE_X[0];
const SAFE_CX = (SAFE_X[0] + SAFE_X[1]) / 2;
const r3 = (x) => Math.round(x * 1000) / 1000;
const word = (id) => edl.words.find((w) => w.id === id);
const gfx = (effect) => edl.graphics.find((g) => g.effect === effect);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

mkdirSync(join(outDir, "compositions"), { recursive: true });

// ---------- scene file helper ----------
function scene(id, css, body, js) {
  return `<template>
  <style>
    #root { position: absolute; inset: 0; pointer-events: none; font-family: ${S.font}, sans-serif; }
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

// ---------- captions ----------
function captionsScene() {
  const capY = (CAP[0] + CAP[1]) / 2;
  let body = "";
  let js = "";
  edl.captions.forEach((c) => {
    const text = c.words.map((w) => w.text).join(" ");
    // Inter 900 uppercase ~0.68em per glyph; fit inside the safe width, cap at 84px.
    const size = Math.max(44, Math.min(84, Math.floor(SAFE_W / (text.length * 0.68))));
    body += `    <div id="${c.id}" class="cap clip" data-start="${c.start}" data-duration="${r3(c.end - c.start)}" style="top:${capY - size * 0.6}px;font-size:${size}px">`;
    body += c.words.map((w, i) => `<span id="${c.id}-w${i}" class="w${w.emphasis ? " em" : ""}">${esc(w.text)}</span>`).join("");
    body += `</div>\n`;
    js += `    tl.fromTo("#${c.id}", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.12, ease: "power3.out" }, ${c.start});\n`;
    c.words.forEach((w, i) => {
      const t = Math.max(c.start, w.start);
      js += `    tl.fromTo("#${c.id}-w${i}", { opacity: 0.38, scale: 1 }, { opacity: 1, scale: ${w.emphasis ? 1.1 : 1}, duration: 0.08, ease: "power2.out" }, ${t});\n`;
    });
    js += `    tl.to("#${c.id}", { opacity: 0, duration: 0.1, ease: "power2.in" }, ${r3(c.end - 0.1)});\n`;
  });
  const css = `    .cap { position: absolute; left: 0; width: 100%; padding: 0 ${W - SAFE_X[1]}px 0 ${SAFE_X[0]}px; text-align: center;
           font-weight: 900; letter-spacing: -0.02em; line-height: 1.1; color: ${S.ink}; overflow: visible;
           text-shadow: 0 4px 18px rgba(0,0,0,.55); }
    .cap .w { display: inline-block; margin: 0 0.16em; }
    .cap .w.em { color: ${S.accent}; }`;
  return scene("captions", css, body, js);
}

// ---------- hook: LOOK #08 slot counter ----------
function badgeCounterScene(g) {
  const L = (t) => r3(t - g.start);
  const len = r3(g.end - g.start);
  const to = g.params.to;
  const digits = Array.from({ length: to + 1 }, (_, i) => `<div>${String(i).padStart(1, "0")}</div>`).join("");
  const css = `    #hb-card { position: absolute; left: ${SAFE_CX - 200}px; top: ${GFX[0] + 90}px; width: 400px; height: 150px; border-radius: 28px;
               background: rgba(18,22,40,.78); border: 2px solid rgba(255,255,255,.14); box-shadow: 0 20px 60px rgba(0,0,0,.45);
               display: flex; align-items: center; justify-content: center; gap: 22px; color: ${S.ink}; }
    #hb-label { font-size: 40px; font-weight: 700; letter-spacing: .12em; opacity: .75; }
    #hb-num { display: flex; align-items: center; font-size: 96px; font-weight: 900; color: ${S.accent}; }
    #hb-win { height: 104px; overflow: hidden; }
    #hb-strip div { height: 104px; line-height: 104px; }`;
  const body = `    <div id="hb-card" class="clip" data-start="0" data-duration="${len}">
      <div id="hb-label">${esc(g.params.label)}</div>
      <div id="hb-num"><span>#0</span><div id="hb-win" data-layout-allow-overflow data-layout-ignore><div id="hb-strip">${digits}</div></div></div>
    </div>`;
  const js = `    tl.fromTo("#hb-card", { scale: 0.86 }, { scale: 1, duration: 0.3, ease: "back.out(1.6)" }, 0);
    tl.fromTo("#hb-card", { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.22, ease: "power2.out" }, 0);
    tl.fromTo("#hb-strip", { y: 0 }, { y: ${-104 * to}, duration: ${r3(Math.max(0.25, L(word(23).end) - 0.05))}, ease: "power3.out" }, 0.05);
    tl.to("#hb-card", { opacity: 0, filter: "blur(8px)", duration: 0.16, ease: "power2.in" }, ${r3(len - 0.17)});`;
  return scene("hookbadge", css, body, js);
}

// ---------- READY check badge ----------
function readyScene(g) {
  const len = r3(g.end - g.start);
  const css = `    #rd-pill { position: absolute; left: ${SAFE_CX - 190}px; top: ${GFX[0] + 110}px; width: 380px; height: 120px; border-radius: 60px;
               background: ${S.accent}; color: #0A0F05; display: flex; align-items: center; justify-content: center; gap: 18px;
               font-size: 58px; font-weight: 900; letter-spacing: .04em; box-shadow: 0 18px 50px rgba(182,255,59,.35); }
    #rd-pill svg { width: 58px; height: 58px; }`;
  const body = `    <div id="rd-pill" class="clip" data-start="0" data-duration="${len}">
      <svg viewBox="0 0 24 24" fill="none" stroke="#0A0F05" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path id="rd-check" d="M4 12.5l5 5L20 6.5" stroke-dasharray="24" stroke-dashoffset="24"/></svg>
      <span>${esc(g.params.text)}</span>
    </div>`;
  const js = `    tl.fromTo("#rd-pill", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.28, ease: "back.out(1.8)" }, 0);
    tl.fromTo("#rd-check", { attr: { "stroke-dashoffset": 24 } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.22, ease: "power2.out" }, 0.08);
    tl.to("#rd-pill", { opacity: 0, y: -20, filter: "blur(6px)", duration: 0.14, ease: "power2.in" }, ${r3(len - 0.15)});`;
  return scene("ready", css, body, js);
}

// ---------- 3-node flow diagram ----------
const ICONS = {
  doc: `<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h6"/>`,
  face: `<circle cx="12" cy="9" r="4"/><path d="M4.5 21c1.2-4 4-6 7.5-6s6.3 2 7.5 6"/>`,
  play: `<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M10 9l5 3-5 3z"/>`,
};
function flowScene(g) {
  const len = r3(g.end - g.start);
  const n = g.params.nodes;
  const cardW = 216, gap = 60, cardH = 230, top = GFX[0] + 60;
  const x0 = SAFE_X[0];
  let body = `    <div id="fl-wrap" class="clip" data-start="0" data-duration="${len}">\n`;
  body += `      <svg id="fl-links" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  for (let i = 0; i < n.length - 1; i++) {
    const xa = x0 + i * (cardW + gap) + cardW + 6, xb = xa + gap - 12, y = top + cardH / 2;
    body += `<path id="fl-l${i}" d="M${xa} ${y} L${xb} ${y}" stroke="${S.accent}" stroke-width="6" stroke-linecap="round" fill="none" stroke-dasharray="${gap}" stroke-dashoffset="${gap}"/>`;
  }
  body += `</svg>\n`;
  n.forEach((node, i) => {
    body += `      <div id="fl-n${i}" class="node" style="left:${x0 + i * (cardW + gap)}px;top:${top}px;width:${cardW}px;height:${cardH}px">
        <svg viewBox="0 0 24 24" fill="none" stroke="${i === n.length - 1 ? S.accent : S.ink}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[node.icon]}</svg>
        <div class="lbl">${esc(node.label)}</div>
      </div>\n`;
  });
  body += `    </div>`;
  const css = `    #fl-wrap { position: absolute; inset: 0; }
    #fl-links { position: absolute; left: 0; top: 0; }
    .node { position: absolute; border-radius: 30px; background: rgba(18,22,40,.82); border: 2px solid rgba(255,255,255,.16);
            box-shadow: 0 18px 50px rgba(0,0,0,.45); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
    .node svg { width: 92px; height: 92px; }
    .node .lbl { color: ${S.ink}; font-size: 38px; font-weight: 700; }`;
  let js = "";
  n.forEach((node, i) => {
    const t = r3(node.t - g.start);
    js += `    tl.fromTo("#fl-n${i}", { opacity: 0, scale: 0.82, y: 24, filter: "blur(8px)" }, { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", duration: 0.32, ease: "expo.out" }, ${t});\n`;
    if (i > 0) js += `    tl.fromTo("#fl-l${i - 1}", { attr: { "stroke-dashoffset": ${gap} } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.2, ease: "power2.out" }, ${r3(Math.max(0, t - 0.12))});\n`;
  });
  js += `    tl.fromTo("#fl-n${n.length - 1}", { boxShadow: "0 18px 50px rgba(0,0,0,.45)" }, { boxShadow: "0 0 60px rgba(182,255,59,.55)", duration: 0.3, ease: "power2.out" }, ${r3(n.at(-1).t - g.start + 0.25)});\n`;
  js += `    tl.to("#fl-wrap", { opacity: 0, filter: "blur(10px)", duration: 0.18, ease: "power2.in" }, ${r3(len - 0.19)});`;
  return scene("flow", css, body, js);
}

// ---------- UI button click + typed reply ----------
function feedbackScene(g) {
  const len = r3(g.end - g.start);
  const p = g.params;
  const press = r3(p.press - g.start);
  const reply = r3(p.reply_from - g.start);
  const top = GFX[0] + 20, cardW = SAFE_W, cardH = 320, x = SAFE_X[0];
  const btnW = 520, btnH = 112, btnX = (cardW - btnW) / 2, btnY = 150;
  const cursorTarget = { x: x + btnX + btnW * 0.62, y: top + btnY + btnH * 0.58 };
  const chars = [...p.reply];
  const css = `    #fb-card { position: absolute; left: ${x}px; top: ${top}px; width: ${cardW}px; height: ${cardH}px; border-radius: 34px;
               background: rgba(16,20,36,.86); border: 2px solid rgba(255,255,255,.14); box-shadow: 0 24px 70px rgba(0,0,0,.5); }
    #fb-title { position: absolute; left: 0; width: 100%; top: 48px; text-align: center; color: ${S.ink}; font-size: 38px; font-weight: 700; opacity: .85; }
    #fb-btn { position: absolute; left: ${btnX}px; top: ${btnY}px; width: ${btnW}px; height: ${btnH}px; border-radius: 56px; background: ${S.accent};
              color: #0A0F05; font-size: 46px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
    #fb-field { position: absolute; left: ${btnX - 40}px; top: ${btnY}px; width: ${btnW + 80}px; height: ${btnH}px; border-radius: 26px;
                background: rgba(255,255,255,.08); border: 2px solid ${S.accent}; color: ${S.ink}; font-size: 48px; font-weight: 700;
                display: flex; align-items: center; padding-left: 34px; opacity: 0; }
    #fb-field .ch { opacity: 0; }
    #fb-caret { width: 4px; height: 54px; background: ${S.accent}; margin-left: 4px; }
    #fb-sent { position: absolute; right: 30px; top: 26px; padding: 8px 20px; border-radius: 22px; background: ${S.accent}; color: #0A0F05;
               font-size: 30px; font-weight: 900; opacity: 0; }
    #fb-cursor { position: absolute; left: 0; top: 0; width: 70px; height: 70px; }`;
  const body = `    <div id="fb-wrap" class="clip" data-start="0" data-duration="${len}">
      <div id="fb-card">
        <div id="fb-title">How is your digital twin?</div>
        <div id="fb-btn">${esc(p.button)}</div>
        <div id="fb-field">${chars.map((c, i) => `<span id="fb-c${i}" class="ch">${c === " " ? "&nbsp;" : esc(c)}</span>`).join("")}<span id="fb-caret"></span></div>
        <div id="fb-sent">SENT</div>
      </div>
      <svg id="fb-cursor" viewBox="0 0 24 24"><path d="M4 2l15 9.5-6.6 1.4 3.9 7.4-2.9 1.5-3.9-7.4L4 18.6z" fill="#fff" stroke="#0A0F05" stroke-width="1.3" stroke-linejoin="round"/></svg>
    </div>`;
  let js = `    tl.fromTo("#fb-card", { opacity: 0, y: 40, scale: 0.94, filter: "blur(8px)" }, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.4, ease: "expo.out" }, 0);
    tl.fromTo("#fb-cursor", { x: ${x + cardW - 20}, y: ${top + cardH + 260}, opacity: 0 }, { x: ${x + cardW - 20}, y: ${top + cardH + 260}, opacity: 1, duration: 0.15 }, 0.25);
    tl.to("#fb-cursor", { x: ${r3(cursorTarget.x)}, y: ${r3(cursorTarget.y)}, duration: ${r3(Math.max(0.4, press - 0.45))}, ease: "power2.inOut" }, 0.4);
    tl.to("#fb-btn", { scale: 0.93, duration: 0.07, ease: "power2.in" }, ${press});
    tl.to("#fb-cursor", { scale: 0.85, duration: 0.07, ease: "power2.in" }, ${press});
    tl.to("#fb-btn", { scale: 1, duration: 0.16, ease: "back.out(2)" }, ${r3(press + 0.07)});
    tl.to("#fb-cursor", { scale: 1, duration: 0.16, ease: "power2.out" }, ${r3(press + 0.07)});
    tl.to("#fb-btn", { opacity: 0, scale: 1.08, filter: "blur(6px)", duration: 0.16, ease: "power2.in" }, ${r3(reply - 0.3)});
    tl.fromTo("#fb-field", { opacity: 0, scaleX: 0.9 }, { opacity: 1, scaleX: 1, duration: 0.2, ease: "power3.out" }, ${r3(reply - 0.2)});
    tl.to("#fb-cursor", { opacity: 0, duration: 0.15 }, ${r3(reply - 0.2)});\n`;
  chars.forEach((_, i) => {
    js += `    tl.set("#fb-c${i}", { opacity: 1 }, ${r3(reply + 0.05 * i)});\n`;
  });
  const typedEnd = r3(reply + 0.05 * chars.length);
  js += `    tl.fromTo("#fb-sent", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.2, ease: "back.out(2)" }, ${r3(typedEnd + 0.02)});
    tl.to("#fb-wrap", { opacity: 0, filter: "blur(10px)", duration: 0.18, ease: "power2.in" }, ${r3(len - 0.19)});`;
  return scene("feedback", css, body, js);
}

// ---------- sign-off ----------
function outroScene(g) {
  const len = r3(g.end - g.start);
  const words = g.params.text.split(" ");
  const css = `    #ou-wrap { position: absolute; left: ${SAFE_X[0]}px; width: ${SAFE_W}px; top: ${GFX[0] + 70}px; text-align: center; }
    #ou-line { color: ${S.ink}; font-size: 46px; font-weight: 700; opacity: .9; }
    #ou-line span { display: inline-block; margin: 0 6px; }
    #ou-handle { position: relative; margin-top: 18px; font-size: 92px; font-weight: 900; letter-spacing: -0.02em; color: ${S.accent}; display: inline-block; overflow: hidden; }
    #ou-sweep { position: absolute; top: 0; left: 0; width: 40%; height: 100%;
                background: linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.75) 50%, rgba(255,255,255,0) 100%); mix-blend-mode: overlay; }`;
  const body = `    <div id="ou-wrap" class="clip" data-start="0" data-duration="${len}" data-layout-allow-overflow>
      <div id="ou-line">${words.map((w, i) => `<span id="ou-w${i}">${esc(w)}</span>`).join("")}</div>
      <div id="ou-handle">${esc(g.params.handle)}<div id="ou-sweep"></div></div>
    </div>`;
  let js = "";
  words.forEach((_, i) => {
    js += `    tl.fromTo("#ou-w${i}", { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.13, ease: "power2.out" }, ${r3(0.067 * i)});\n`;
  });
  js += `    tl.fromTo("#ou-handle", { opacity: 0, y: 30, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.35, ease: "expo.out" }, ${r3(0.067 * words.length + 0.05)});
    tl.fromTo("#ou-sweep", { x: -300 }, { x: 900, duration: 0.6, ease: "power2.inOut" }, ${r3(0.067 * words.length + 0.3)});`;
  return scene("outro", css, body, js);
}

// ---------- root ----------
const behind = gfx("text.behind_subject");
const tw = (id) => r3(word(id).start);
const camJs = [];
const BG_PARALLAX = 0.35;
camJs.push(`  tl.set("#cam", { scale: 1, transformOrigin: "${FACE[0]}px ${FACE[1]}px" }, 0);`);
camJs.push(`  tl.set("#bgcam", { scale: 1, transformOrigin: "${FACE[0]}px ${FACE[1]}px" }, 0);`);
for (const c of edl.camera) {
  const bg = r3(1 + (c.scale - 1) * BG_PARALLAX);
  if (c.type === "cut") {
    camJs.push(`  tl.set("#cam", { scale: ${c.scale} }, ${c.t});`);
    camJs.push(`  tl.set("#bgcam", { scale: ${bg} }, ${c.t});`);
  } else {
    camJs.push(`  tl.to("#cam", { scale: ${c.scale}, duration: ${c.duration}, ease: "${c.ease}" }, ${c.t});`);
    camJs.push(`  tl.to("#bgcam", { scale: ${bg}, duration: ${c.duration}, ease: "${c.ease}" }, ${c.t});`);
  }
}
// Behind-subject headline: one line per spoken word, inside the camera so it zooms with the world.
const bLen = r3(behind.end - behind.start);
camJs.push(`  tl.fromTo("#bh-l1", { opacity: 0, y: 70, filter: "blur(10px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.35, ease: "expo.out" }, ${tw(25)});`);
camJs.push(`  tl.fromTo("#bh-l2", { opacity: 0, y: 90, scale: 0.92, filter: "blur(10px)" }, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.4, ease: "expo.out" }, ${tw(26)});`);
camJs.push(`  tl.to(["#bh-l1", "#bh-l2"], { opacity: 0, filter: "blur(10px)", duration: 0.2, ease: "power2.in" }, ${r3(behind.end - 0.21)});`);

const sceneHosts = [
  ["hookbadge", gfx("badge.counter")],
  ["ready", gfx("badge.check")],
  ["flow", gfx("diagram.flow3")],
  ["feedback", gfx("ui.button_click")],
  ["outro", gfx("title.signoff")],
]
  .map(([id, g]) => `      <div id="${id}" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${g.start}" data-duration="${r3(g.end - g.start)}" data-track-index="2" data-track-kind="graphics" data-width="${W}" data-height="${H}" style="z-index:5"></div>`)
  .join("\n");

const sfxLanes = [];
const sfxTags = edl.sfx
  .map((s, i) => {
    const len = { whoosh: 0.45, pop: 0.12, click: 0.04, ding: 0.6, shimmer: 0.7 }[s.name] ?? 0.5;
    let lane = sfxLanes.findIndex((end) => end <= s.t);
    if (lane < 0) { lane = sfxLanes.length; sfxLanes.push(0); }
    sfxLanes[lane] = s.t + len;
    const vol = { whoosh: 0.55, pop: 0.45, click: 0.6, ding: 0.35, shimmer: 0.3 }[s.name] ?? 0.5;
    return `      <audio id="sfx${i}" src="assets/sfx/${s.name}.wav" data-start="${s.t}" data-duration="${r3(Math.min(len, D - s.t))}" data-volume="${vol}" data-track-index="${4 + lane}"></audio>`;
  })
  .join("\n");

const index = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <!-- GENERATED by scripts/build_composition.mjs from ${edl.generated_from} (${edl.video_id}). Edit the storyboard, not this file. -->
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: ${S.ground_bottom}; }
      #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; font-family: ${S.font}, sans-serif; }
      #ground { position: absolute; inset: 0; background:
                radial-gradient(120% 70% at 50% 58%, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%),
                linear-gradient(180deg, ${S.ground_top} 0%, #0A0E22 55%, ${S.ground_bottom} 100%); }
      #bgcam { position: absolute; inset: 0; }
      #grid { position: absolute; inset: -120px; opacity: .55;
              background-image: linear-gradient(rgba(255,255,255,.05) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,.05) 2px, transparent 2px);
              background-size: 90px 90px; }
      #glow { position: absolute; left: ${FACE[0] - 520}px; top: ${FACE[1] - 640}px; width: 1040px; height: 1040px; border-radius: 50%;
              background: radial-gradient(circle, rgba(92,120,255,.42) 0%, rgba(92,120,255,.12) 42%, rgba(92,120,255,0) 70%); }
      #cam { position: absolute; inset: 0; }
      #behind { position: absolute; inset: 0; z-index: 2; }
      .bh { position: absolute; left: 0; width: 100%; text-align: center; font-weight: 900; letter-spacing: -0.04em; line-height: 1; }
      #bh-l1 { top: 760px; font-size: 170px; margin-left: -36px; color: transparent; -webkit-text-stroke: 4px rgba(255,255,255,.9); }
      #bh-l2 { top: 915px; font-size: 280px; margin-left: -36px; color: ${S.accent}; text-shadow: 0 0 60px rgba(182,255,59,.35); }
      #freeze { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; object-fit: contain; z-index: 3; }
      #cutout { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; object-fit: contain; z-index: 3; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${D}" data-width="${W}" data-height="${H}">
      <div id="ground"></div>
      <div id="bgcam"><div id="grid"></div><div id="glow"></div></div>
      <div id="cam">
        <div id="behind" class="clip" data-start="${behind.start}" data-duration="${bLen}" data-track-index="1" data-layout-allow-overlap>
          <div id="bh-l1" class="bh">${esc(behind.params.lines[0])}</div>
          <div id="bh-l2" class="bh">${esc(behind.params.lines[1])}</div>
        </div>
        <video id="cutout" class="clip" src="assets/avatar_alpha_refined.webm" muted playsinline data-start="0" data-duration="${SRC}" data-track-index="0" data-layout-allow-occlusion></video>
        ${D > SRC ? `<img id="freeze" class="clip" src="assets/freeze.png" alt="" data-start="${SRC}" data-duration="${r3(D - SRC)}" data-track-index="0" data-layout-allow-occlusion />` : ""}
      </div>
      <audio id="voice" src="assets/voice.wav" data-start="0" data-duration="${SRC}" data-volume="1" data-track-index="3"></audio>
${sceneHosts}
      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${D}" data-track-index="3" data-track-kind="captions" data-width="${W}" data-height="${H}" style="z-index:6"></div>
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

writeFileSync(join(outDir, "index.html"), index);
writeFileSync(join(outDir, "compositions/captions.html"), captionsScene());
writeFileSync(join(outDir, "compositions/hookbadge.html"), badgeCounterScene(gfx("badge.counter")));
writeFileSync(join(outDir, "compositions/ready.html"), readyScene(gfx("badge.check")));
writeFileSync(join(outDir, "compositions/flow.html"), flowScene(gfx("diagram.flow3")));
writeFileSync(join(outDir, "compositions/feedback.html"), feedbackScene(gfx("ui.button_click")));
writeFileSync(join(outDir, "compositions/outro.html"), outroScene(gfx("title.signoff")));
console.log(`built ${outDir}/index.html + 6 scenes (${edl.sfx.length} sfx, ${edl.camera.length} camera moves)`);
