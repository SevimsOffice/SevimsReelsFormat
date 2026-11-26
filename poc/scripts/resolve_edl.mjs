#!/usr/bin/env node
// Deterministic EDL resolver: storyboard (anchored to word ids) + words.json -> edl.json (seconds + frames).
// Usage: node scripts/resolve_edl.mjs storyboard.json work/edl.json
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const [, , sbPath = "storyboard.json", outPath = "work/edl.json"] = process.argv;
const sb = JSON.parse(readFileSync(sbPath, "utf8"));
const root = dirname(resolve(sbPath));
const words = JSON.parse(readFileSync(resolve(root, sb.source.words_file), "utf8")).words;
const byId = new Map(words.map((w) => [w.i, w]));
const { fps } = sb.canvas;
const off = sb.source.source_offset_sec;
const srcDur = sb.source.duration_sec;
const dur = Math.round((srcDur + (sb.source.tail_hold_sec ?? 0)) * 1000) / 1000;

const r3 = (x) => Math.round(x * 1000) / 1000;
const clamp = (t) => Math.min(Math.max(t, 0), dur);
const frame = (t) => Math.round(t * fps);

function at(anchor) {
  if (anchor === "end") return dur;
  if (typeof anchor === "number") return clamp(anchor);
  const w = byId.get(anchor.word);
  if (!w) throw new Error(`anchor word ${anchor.word} not in transcript`);
  const base = anchor.edge === "end" ? w.end : w.start;
  return r3(clamp(base - off + (anchor.offset ?? 0)));
}

const camera = [];
const graphics = [];
const sfx = [];
const captionsOff = [];

for (const beat of sb.beats) {
  if (beat.captions === "off") {
    captionsOff.push([at({ word: beat.words[0], edge: "start", offset: -0.05 }), at({ word: beat.words[1], edge: "end", offset: 0.05 })]);
  }
  beat.events.forEach((ev, k) => {
    const t = at(ev.anchor);
    // sfx_on: "start" (default) | "press" (only at params.press) | "nodes" (at every node build)
    if (ev.sfx && (ev.sfx_on ?? "start") === "start") sfx.push({ name: ev.sfx, t, frame: frame(t), beat: beat.id });
    if (ev.effect.startsWith("camera.")) {
      camera.push({ type: ev.effect.split(".")[1], t, frame: frame(t), ...ev.params });
      return;
    }
    const end = ev.until ? at(ev.until) : r3(t + 1.5);
    const params = structuredClone(ev.params ?? {});
    // Resolve nested anchors inside params (node build times, press time, reply time).
    for (const [key, val] of Object.entries(params)) {
      if (val && typeof val === "object" && "word" in val) params[key] = at(val);
    }
    if (Array.isArray(params.nodes)) params.nodes = params.nodes.map((n) => ({ ...n, t: at(n.anchor), anchor: undefined }));
    if (params.nodes && ev.sfx && ev.sfx_on === "nodes") for (const n of params.nodes) sfx.push({ name: ev.sfx, t: n.t, frame: frame(n.t), beat: beat.id });
    if (typeof params.press === "number" && ev.sfx && ev.sfx_on === "press") sfx.push({ name: ev.sfx, t: params.press, frame: frame(params.press), beat: beat.id });
    graphics.push({ id: `${beat.id}-${ev.effect.replace(".", "-")}-${k}`, effect: ev.effect, beat: beat.id, start: t, end, frames: [frame(t), frame(end)], params });
  });
}

const emph = new Set(sb.captions.emphasis ?? []);
const overlapsOff = (s, e) => captionsOff.some(([a, b]) => s < b && e > a);
const captions = sb.captions.groups
  .map((ids, g) => {
    const ws = ids.map((id) => byId.get(id));
    const start = r3(Math.max(0.1, clamp(ws[0].start - off - 0.08)));
    const nextFirst = sb.captions.groups[g + 1] ? byId.get(sb.captions.groups[g + 1][0]) : null;
    const naturalEnd = clamp(ws.at(-1).end - off + 0.22);
    const end = r3(nextFirst ? Math.min(naturalEnd, clamp(nextFirst.start - off - 0.08)) : clamp(Math.max(naturalEnd, dur - 0.05)));
    return {
      id: `cap${g}`,
      start,
      end,
      frames: [frame(start), frame(end)],
      words: ws.map((w) => ({ id: w.i, text: w.w.toUpperCase(), start: r3(clamp(w.start - off)), end: r3(clamp(w.end - off)), emphasis: emph.has(w.i) })),
    };
  })
  .filter((c) => !overlapsOff(c.start, c.end));

camera.sort((a, b) => a.t - b.t);
sfx.sort((a, b) => a.t - b.t);

const edl = {
  video_id: sb.video_id,
  generated_from: sbPath,
  canvas: sb.canvas,
  duration: dur,
  source_duration: srcDur,
  frames: frame(dur),
  source: sb.source,
  zones: sb.zones,
  style: sb.style,
  camera,
  graphics,
  captions,
  captions_off: captionsOff,
  words: words
    .filter((w) => w.i >= sb.source.word_id_range[0] && w.i <= sb.source.word_id_range[1])
    .map((w) => ({ id: w.i, text: w.w, start: r3(clamp(w.start - off)), end: r3(clamp(w.end - off)) })),
  sfx,
};

// Basic validation: overlapping major graphics, sfx too close, events outside the clip.
const warnings = [];
const majors = graphics.filter((g) => !g.effect.startsWith("badge."));
for (let i = 1; i < majors.length; i++) if (majors[i].start < majors[i - 1].end - 0.001) warnings.push(`major graphics overlap: ${majors[i - 1].id} / ${majors[i].id}`);
for (let i = 1; i < sfx.length; i++) if (sfx[i].t - sfx[i - 1].t < 0.08) warnings.push(`sfx closer than 80 ms at ${sfx[i].t}s`);
edl.warnings = warnings;

writeFileSync(outPath, JSON.stringify(edl, null, 1));
console.log(`EDL: ${camera.length} camera, ${graphics.length} graphics, ${captions.length} caption groups, ${sfx.length} sfx -> ${outPath}`);
if (warnings.length) console.log("warnings:\n  " + warnings.join("\n  "));
