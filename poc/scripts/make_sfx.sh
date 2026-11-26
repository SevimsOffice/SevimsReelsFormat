#!/usr/bin/env bash
# Generate license-free sound effects with ffmpeg (no external SFX library needed for the PoC).
set -euo pipefail
OUT="$(cd "$(dirname "$0")/.." && pwd)/reel-test/assets/sfx"; mkdir -p "$OUT"; cd "$OUT"
ffmpeg -loglevel error -y -f lavfi -i "anoisesrc=d=0.45:c=pink:r=48000:a=0.9" -af "highpass=f=300,lowpass=f=6000,afade=t=in:st=0:d=0.22:curve=exp,afade=t=out:st=0.22:d=0.23:curve=exp,aphaser=in_gain=0.6:out_gain=0.9:delay=2:decay=0.4:speed=1.5,volume=1.6" -ac 2 whoosh.wav
ffmpeg -loglevel error -y -f lavfi -i "sine=f=880:d=0.12:r=48000" -af "afade=t=out:st=0.01:d=0.11:curve=exp,volume=0.7" -ac 2 pop.wav
ffmpeg -loglevel error -y -f lavfi -i "anoisesrc=d=0.04:c=white:r=48000:a=0.8" -af "highpass=f=2000,afade=t=out:st=0:d=0.04:curve=exp,volume=0.9" -ac 2 click.wav
ffmpeg -loglevel error -y -f lavfi -i "sine=f=1318.5:d=0.6:r=48000" -f lavfi -i "sine=f=1760:d=0.6:r=48000" -filter_complex "[0][1]amix=inputs=2,afade=t=out:st=0.02:d=0.58:curve=exp,volume=0.5" -ac 2 ding.wav
ffmpeg -loglevel error -y -f lavfi -i "aevalsrc='0.25*sin(2*PI*(400+1600*t*t)*t)':d=0.7:s=48000" -af "afade=t=in:st=0:d=0.5,afade=t=out:st=0.5:d=0.2,volume=0.6" -ac 2 shimmer.wav
ls -1 "$OUT"
