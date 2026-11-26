import json, sys
from faster_whisper import WhisperModel
import subprocess, numpy as np
audio, out = sys.argv[1], sys.argv[2]
model = WhisperModel("small", device="cpu", compute_type="int8")
pcm = subprocess.run(["ffmpeg","-loglevel","error","-i",audio,"-f","f32le","-ac","1","-ar","16000","-"],capture_output=True,check=True).stdout
arr = np.frombuffer(pcm, dtype=np.float32)
segments, info = model.transcribe(arr, word_timestamps=True, vad_filter=False, beam_size=5)
words = []
segs = []
for s in segments:
    segs.append({"start": s.start, "end": s.end, "text": s.text.strip()})
    for w in s.words:
        words.append({"i": len(words), "w": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3), "p": round(w.probability, 3)})
json.dump({"language": info.language, "language_probability": info.language_probability, "segments": segs, "words": words}, open(out, "w"), indent=1, ensure_ascii=False)
print(info.language, info.language_probability)
for s in segs: print(f"[{s['start']:6.2f}-{s['end']:6.2f}] {s['text']}")
