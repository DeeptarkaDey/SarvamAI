import os
import sys
import time
from pathlib import Path
from pyngrok import ngrok

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

for line in Path(".env").read_text(encoding="utf-8").splitlines():
    name, sep, val = line.partition("=")
    if sep and name.strip() == "NGROK_AUTHTOKEN":
        ngrok.set_auth_token(val.strip().strip("\"'"))

print("Starting persistent ngrok tunnel on port 8000...")
tunnel = ngrok.connect(8000)
print("==================================================")
print("SUNO IS LIVE ONLINE VIA NGROK:")
print("PUBLIC_URL: " + tunnel.public_url)
print("==================================================")

# Write public URL to a text file for instant access
Path("ngrok_url.txt").write_text(tunnel.public_url, encoding="utf-8")

try:
    ngrok_process = ngrok.get_ngrok_process()
    ngrok_process.proc.wait()
except KeyboardInterrupt:
    print("Shutting down ngrok tunnel.")
    ngrok.kill()
