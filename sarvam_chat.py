import os
from pathlib import Path

from sarvamai import SarvamAI

for line in Path(__file__).with_name(".env").read_text(encoding="utf-8").splitlines():
    name, separator, value = line.partition("=")
    if separator and name.strip() == "SARVAM_API_KEY" and not os.environ.get(name.strip()):
        os.environ[name.strip()] = value.strip().strip("\"'")

api_key = os.environ.get("SARVAM_API_KEY")
if not api_key:
    raise SystemExit("Add your Sarvam API key to .env as SARVAM_API_KEY=...")

client = SarvamAI(api_subscription_key=api_key)
response = client.chat.completions(
    model="sarvam-105b-conversations",
    messages=[{"role": "user", "content": "Give me tech pick up lines. Make it explicit ."}],
)
print(response.choices[0].message.content)
