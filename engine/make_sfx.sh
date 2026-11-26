#!/usr/bin/env bash
# License-free SFX for the noir editorial look, synthesized with ffmpeg.
set -euo pipefail
cd "$(dirname "$0")/sfx"
q="-loglevel error -y"
ffmpeg $q -f lavfi -i "sine=f=55:d=0.9:r=48000" -f lavfi -i "anoisesrc=d=0.12:c=brown:r=48000:a=0.9" -filter_complex "[0]afade=t=out:st=0:d=0.9:curve=exp,volume=1.4[a];[1]lowpass=f=900,afade=t=out:st=0:d=0.12[b];[a][b]amix=inputs=2:normalize=0" -ac 2 impact.wav
ffmpeg $q -f lavfi -i "anoisesrc=d=0.5:c=pink:r=48000:a=0.7" -af "highpass=f=1200,lowpass=f=7000,afade=t=in:st=0:d=0.08,afade=t=out:st=0.15:d=0.35:curve=exp,tremolo=f=22:d=0.6" -ac 2 paper.wav
ffmpeg $q -f lavfi -i "sine=f=2400:d=0.06:r=48000" -af "afade=t=out:st=0:d=0.06:curve=exp,volume=0.5" -ac 2 tick.wav
ffmpeg $q -f lavfi -i "anoisesrc=d=0.35:c=brown:r=48000:a=1" -f lavfi -i "sine=f=120:d=0.2:r=48000" -filter_complex "[0]lowpass=f=1800,afade=t=out:st=0:d=0.3:curve=exp[a];[1]afade=t=out:st=0:d=0.2:curve=exp[b];[a][b]amix=inputs=2:normalize=0,volume=1.3" -ac 2 stamp.wav
ffmpeg $q -f lavfi -i "anoisesrc=d=0.45:c=pink:r=48000:a=0.9" -af "highpass=f=300,lowpass=f=5000,afade=t=in:st=0:d=0.22:curve=exp,afade=t=out:st=0.22:d=0.23:curve=exp,volume=1.4" -ac 2 whoosh.wav
ffmpeg $q -f lavfi -i "anoisesrc=d=0.6:c=white:r=48000:a=0.5" -af "bandpass=f=3500:width_type=h:w=2500,tremolo=f=14:d=0.8,afade=t=in:st=0:d=0.05,afade=t=out:st=0.4:d=0.2,volume=0.8" -ac 2 pen.wav
ffmpeg $q -f lavfi -i "anoisesrc=d=0.3:c=white:r=48000:a=0.8" -af "highpass=f=2500,afade=t=in:st=0:d=0.03,afade=t=out:st=0.05:d=0.25:curve=exp" -ac 2 slash.wav
ls
