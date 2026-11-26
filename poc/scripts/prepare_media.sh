#!/usr/bin/env bash
# Prepare source media for the PoC composition.
# Usage: scripts/prepare_media.sh <source.mp4> <start_sec> <end_sec>
# Produces in reel-test/assets/: avatar.mp4, avatar_alpha.webm (AI matte), avatar_alpha_refined.webm,
# freeze.png (last frame, for the tail hold), voice.wav.
set -euo pipefail
SRC=${1:?source video}; START=${2:?start sec}; END=${3:?end sec}
HERE=$(cd "$(dirname "$0")/.." && pwd)
A="$HERE/reel-test/assets"; mkdir -p "$A"
HF="node ${HF_SKILLS:-/root/.claude/skills}/hyperframes/scripts/plugin-cli.mjs"

# 1) Trim + upscale to 1080x1920 @30 fps (source is 720x1280).
ffmpeg -loglevel error -y -ss "$START" -to "$END" -i "$SRC" -vf "scale=1080:1920:flags=lanczos,fps=30" \
  -c:v libx264 -crf 14 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 "$A/avatar.mp4"

# 2) AI background removal (HyperFrames, local ONNX model; ~2 fps on CPU).
#    If onnxruntime-node fails to install, install it once with:
#    npm install onnxruntime-node@1.21.1 --prefix ~/.cache/hyperframes/optional/onnxruntime-node@1.21.1 --onnxruntime-node-install-cuda=skip
(cd "$A" && $HF remove-background avatar.mp4 -o avatar_alpha.webm --quality best)

# 3) Hybrid matte. The AI matte cut a hole in the white shirt under the hand; the source background is
#    pure black (luma 0) and the darkest subject pixels (pupils) are luma >= 34, so:
#    alpha = max( luma key (12..40), AI alpha eroded 5 px )  -> fixes holes, drops the dark edge fringe.
ffmpeg -loglevel error -y -i "$A/avatar.mp4" -c:v libvpx-vp9 -i "$A/avatar_alpha.webm" -filter_complex "\
[1:v]format=yuva420p,alphaextract,erosion,erosion,erosion,erosion,erosion[mlE];\
[0:v]format=gray,lut=y='clip((val-12)*255/28,0,255)'[lumA];\
[mlE][lumA]blend=all_mode=lighten[A];\
[0:v]format=yuv420p[rgb];[rgb][A]alphamerge,format=yuva420p[out]" -map "[out]" -an \
  -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 6M -deadline good -cpu-used 2 -row-mt 1 -auto-alt-ref 0 \
  -metadata:s:v:0 alpha_mode=1 "$A/avatar_alpha_refined.webm"

# 4) Last frame (with alpha) for the end-card hold, and the voice track.
ffmpeg -loglevel error -y -c:v libvpx-vp9 -sseof -0.04 -i "$A/avatar_alpha_refined.webm" -frames:v 1 -pix_fmt rgba -update 1 "$A/freeze.png"
ffmpeg -loglevel error -y -i "$A/avatar.mp4" -vn -ac 2 -ar 48000 -c:a pcm_s16le "$A/voice.wav"
echo "media ready in $A"
