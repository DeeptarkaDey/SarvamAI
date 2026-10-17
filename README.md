# 🎙️ Suno (सुनो / విनु)
### Voice-First, Language-Matched Dating for IIIT Hyderabad

> **One-line Pitch:** *You don't swipe on faces, you swipe on voices — and you get matched to people who speak the way you actually speak.*

---

## 💡 The Insight & Campus Reality
Campus dating at a place like **IIIT-H** is broken for a reason most dating apps ignore: **the campus is tiny and everyone will see everyone tomorrow.** 

The real blocker isn't finding people — there are only ~3,000 students — it's the **social risk of being seen trying**. Add a photo-first, Delhi/Mumbai-metro-tuned app to a pan-India, code-switching, hostel-and-mess culture, and it feels alien: you're judging people by a gym selfie when the actual chemistry is whether you can talk to them for an hour without it being awkward.

**Suno flips the order:** Voice first, language-matched, photo later, always reversible.

---

## 🚀 Core Features & Technical Architecture

### 1. 🛡️ Closed, Verified Campus Network
* Sign up exclusively with an `@iiit.ac.in` or `@students.iiit.ac.in` email.
* Verified via **Sarvam Vision / OCR** to read student ID cards (extracting Roll No, UG/PG Batch, Branch, and Hostel).
* Generates an anonymous voice pseudonym in Blind Mode (e.g., *"Kadamba Sambar Purist"*, *"OBH 2 AM Philosopher"*).

### 2. 🎙️ Voice Intro Instead of a Bio
* Users record ~30 seconds answering campus-authentic prompts:
  * *"Pitch your Felicity plan"*
  * *"Defend your mess order (Kadamba South vs Yuktahar vs Palash vs Nilgiri)"*
  * *"Your hottest take on CS vs ECE vs Dual Degree"*
  * *"Best 2 AM spot: BBC, Tantra, or JC?"*
* Powered by **Sarvam Saaras STT** (`saaras:v4` / `saaras:v3`) in `codemix` mode — accurately transcribing messy Hinglish, Tenglish, and campus slang without robotic errors.

### 3. 🧠 The Killer Feature: Indic Language Match & Code-Switch Synergy
* Standard dating apps only look at text bios or location. Suno analyzes the **acoustic & conversational rhythm**:
  * **Code-Switch Detection:** Quantifies Hinglish, Tenglish, Pan-Indic Polyglot blends, and slang density.
  * **Campus Lexicon Extraction:** Recognizes institutional touchpoints (*Felicity, Kadamba, Tantra, JC, OBH, NBH, Parijaat, Bakul, LitC, Turing*).
  * **Synergy Badge:** Displays *"🔥 92% Code-Switch Synergy"* and explains the linguistic bridge (e.g., *"Hinglish x Tenglish Bridge"*).
  * **Sarvam-105B Reasoning:** Explains why two people vibe based on conversational cadence and campus habits.

### 4. 🎭 Blind Mode (Voice Swiping)
* Real photos are blurred behind an animated Indic audio-aura gradient.
* Interactive canvas-based sound wave visualizer reacts dynamically to audio playback.
* You judge someone by their humor, intellect, and conversational rhythm before appearances.

### 5. 🤖 The AI Icebreaker Voice Agent
* When two people match, an optional AI voice agent runs a short, guided warm-up call:
  * Generates witty, hyper-campus debate topics using **Sarvam-105B Conversations**.
  * Voiced aloud using **Sarvam Bulbul TTS** (`bulbul:v3`).
  * **Real-Time Cross-Language Translation:** If one person speaks Hindi (*"Bhai sach me biryani aur chai solid hai"*) and the other prefers Telugu or English, Sarvam translates it live into Telugu text and synthesizes speech in an Indic voice (`kavitha_te`).

### 6. ⚡ Kivi as the Power Layer
* Integrates **Kivi**, Sarvam's voice-first desktop dictation AI:
  * Dictate messages hands-free without typing.
  * Formats into custom dating tones:
    * 🕶️ *Campus Chill & Flirty* (preserves authentic Hinglish/Tenglish slang)
    * ⚡ *Nerdy / Tech Witty* (IIIT programmer humor)
    * ☕ *Direct & Warm*
    * 🌸 *Poetic Indic*
  * Remembers personal spellings and campus slang (*OBH, Tantra, Felicity, LitC*).

### 7. 🔒 Consent-First Safety Math
* **Mutual Reveal:** Photos and real identities only unlock when **both** users explicitly tap "Consent to Reveal". Always reversible.
* **Ephemeral Voice Notes:** Voice notes self-destruct after 1 play. No forwards, no downloads.
* **Campus-Aware Coarse Nudges:** Recommends mutual public hubs (*"9:30 PM chai at Tantra or JC?"*) — never exposes exact GPS coordinates.
* **Sarvam 105B Moderation:** Automated safety guardrails prevent harassment and campus doxxing.

---

## ⚡ The 90-Second Stage Demo (For Hackathon Judges)

With **1 click** on the `⚡ 90s Stage Demo` tab, Suno demonstrates the full end-to-end thesis:
1. **Speaker 1 (Kabir):** Plays Hinglish voice bio (*"Bhai simple funda hai... Tantra me chai..."*)
2. **Speaker 2 (Sneha):** Plays Telugu-English voice bio (*"Kadamba South mess dosa on Sunday mornings..."*)
3. **Sarvam Matcher:** Calculates live **92% Code-Switch Synergy**.
4. **AI Host:** Kicks off the warm-up call with a live debate challenge voiced by Sarvam Bulbul.
5. **Live Translation:** Kabir's Hindi message is translated and spoken in Telugu live.
6. **Kivi Power Layer:** Hands-free dictated reply formatted in smooth campus banter.

---

## 🛠️ How to Run Locally

### Prerequisites
* Python 3.10+
* Sarvam AI API Key in `.env` (`SARVAM_API_KEY=...`)

### Setup & Run
```bash
# 1. Activate Virtual Environment
.\.venv\Scripts\Activate.ps1

# 2. Run the FastAPI Server
python server.py
```

Open your browser at:
👉 **`http://127.0.0.1:8000`**