#!/usr/bin/env bash
# Build -> check -> render -> loudness normalize -> QA report.
# Usage: scripts/render_and_qa.sh   (run from poc/)
set -euo pipefail
cd "$(dirname "$0")/.."
HF="node ${HF_SKILLS:-/root/.claude/skills}/hyperframes/scripts/plugin-cli.mjs"
node scripts/resolve_edl.mjs storyboard.json work/edl.json
node scripts/build_composition.mjs work/edl.json reel-test
cd reel-test && mkdir -p out
$HF check --json > out/check.json || true
T0=$(date +%s)
$HF render --quality delivery --fps 30 --workers 4 -o out/reel-test.mp4
RENDER_S=$(( $(date +%s) - T0 ))
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 out/reel-test.mp4)

# Two-pass loudnorm to -14 LUFS / -1.5 dBTP (Instagram-friendly), video stream copied.
J=$(ffmpeg -hide_banner -nostats -i out/reel-test.mp4 -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -vn -f null - 2>&1 | sed -n '/^{/,/^}/p')
MI=$(echo "$J" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
ffmpeg -loglevel error -y -i out/reel-test.mp4 -t "$DUR" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11:$MI:linear=true,aresample=48000" -c:a aac -b:a 192k -movflags +faststart out/reel-test-final.mp4

F=out/reel-test-final.mp4
{
  echo "# QA report"
  echo "- render wall time: ${RENDER_S}s for ${DUR}s of video"
  echo "- streams: $(ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,sample_rate -of compact=p=0 $F | tr '\n' ' ')"
  echo "- black frames: $(ffmpeg -hide_banner -nostats -i $F -vf blackdetect=d=0.1:pix_th=0.10 -an -f null - 2>&1 | grep -c black_start || true)"
  echo "- freezes: $(ffmpeg -hide_banner -nostats -i $F -vf freezedetect=n=-60dB:d=0.5 -an -f null - 2>&1 | grep -oE 'freeze_(start|end): [0-9.]+' | tr '\n' ' ')"
  echo "- loudness: $(ffmpeg -hide_banner -nostats -i $F -af ebur128=peak=true -vn -f null - 2>&1 | grep -A14 Summary | grep -E 'I:|Peak:' | tr -s ' ' | tr '\n' ' ')"
} | tee out/qa-report.md
