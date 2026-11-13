import subprocess, sys
import numpy as np
from faster_whisper import WhisperModel
m = WhisperModel(sys.argv[2] if len(sys.argv) > 2 else "small", device="cpu", compute_type="int8")
raw = subprocess.run(["ffmpeg","-loglevel","error","-i",sys.argv[1],"-ac","1","-ar","16000","-f","f32le","-"],capture_output=True,check=True).stdout
segs, _ = m.transcribe(np.frombuffer(raw,np.float32), beam_size=5, word_timestamps=True, language="pt")
print(" ".join(f"{w.word.strip()}@{w.start:.2f}-{w.end:.2f}" for s in segs for w in s.words))
