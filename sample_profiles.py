import os
from pathlib import Path
from sarvam_service import SarvamService

PROFILES = [
    {
        "id": "profile_sneha",
        "name": "Sneha Rao",
        "pseudonym": "Kadamba Sambar Purist",
        "email": "sneha.rao@students.iiit.ac.in",
        "branch": "ECE 3rd Year",
        "hostel": "Parijaat Nivas",
        "batch": "UG 2022",
        "verified": True,
        "avatar": "/static/avatars/sneha.svg",
        "prompt_question": "Defend your mess order",
        "voice_transcript": "Honestly, anyone who slanders Kadamba South mess dosa on Sunday mornings has never pulled an all-nighter for Embedded Systems. Yuktahar is healthy, fine, but Kadamba sambar is pure emotion.",
        "speaker": "kavitha",
        "language_code": "en-IN",
        "audio_file": "/static/audio/sneha.wav",
        "campus_vibe": "Robotics Lab • Kadamba South • Filter Coffee purist",
        "hobbies": ["Robotics", "Carnatic Vocals", "Badminton", "Embedded C"],
        "reveal_approved": False
    },
    {
        "id": "profile_kabir",
        "name": "Kabir Sharma",
        "pseudonym": "OBH 2 AM Philosopher",
        "email": "kabir.sharma@students.iiit.ac.in",
        "branch": "CSE 4th Year",
        "hostel": "OBH 3rd Floor",
        "batch": "UG 2021",
        "verified": True,
        "avatar": "/static/avatars/kabir.svg",
        "prompt_question": "Pitch your Felicity plan",
        "voice_transcript": "Bhai simple funda hai. LitC debate me participate karenge, cultural night me front row moshpit, aur raat ko teen baje Tantra me maggi aur chai. Agar code submit ho gaya toh hi soenge.",
        "speaker": "kabir",
        "language_code": "hi-IN",
        "audio_file": "/static/audio/kabir.wav",
        "campus_vibe": "Systems Hacker • Felicity Coordinator • 2 AM Tantra regular",
        "hobbies": ["Distributed Systems", "LitC Debates", "Guitar", "Night cycling"],
        "reveal_approved": False
    },
    {
        "id": "profile_ananya",
        "name": "Ananya Sen",
        "pseudonym": "Bakul NLP Hermit",
        "email": "ananya.sen@students.iiit.ac.in",
        "branch": "Dual Degree (CLD) 5th Year",
        "hostel": "Bakul Nivas",
        "batch": "DD 2020",
        "verified": True,
        "avatar": "/static/avatars/ananya.svg",
        "prompt_question": "Hottest take on CS vs ECE vs Dual Degree",
        "voice_transcript": "Dual degree people don't have existential crises, our thesis does! But honestly, if you can code-switch between PyTorch and Telugu linguistics without losing your mind, you deserve an instant treat at JC.",
        "speaker": "priya",
        "language_code": "en-IN",
        "audio_file": "/static/audio/ananya.wav",
        "campus_vibe": "LTRC Researcher • Polyglot • JC Canteen regular",
        "hobbies": ["Indic NLP", "Indie Music", "Psychological Thrillers", "Chai"],
        "reveal_approved": False
    },
    {
        "id": "profile_aditya",
        "name": "Aditya Varma",
        "pseudonym": "Turing Speed Coder",
        "email": "aditya.varma@students.iiit.ac.in",
        "branch": "CSE 2nd Year",
        "hostel": "NBH",
        "batch": "UG 2023",
        "verified": True,
        "avatar": "/static/avatars/aditya.svg",
        "prompt_question": "Best 2 AM spot: BBC, Tantra, or JC?",
        "voice_transcript": "Mawa, Tantra cold coffee at 2:30 AM after a brutal OS assignment hits completely different. JC is good for gossiping, but Tantra is where dreams either die or compile.",
        "speaker": "aditya",
        "language_code": "te-IN",
        "audio_file": "/static/audio/aditya.wav",
        "campus_vibe": "Competitive Programmer • OS Survivor • BBC regular",
        "hobbies": ["Codeforces", "Valorant", "Basketball", "Cold Coffee"],
        "reveal_approved": False
    }
]

def generate_profile_audios(sarvam_svc: SarvamService):
    """Pre-generate voice audio clips for profiles using Sarvam Bulbul TTS."""
    audio_dir = Path("static/audio")
    audio_dir.mkdir(parents=True, exist_ok=True)

    for p in PROFILES:
        target_path = Path("." + p["audio_file"])
        if not target_path.exists():
            print(f"Generating audio for {p['name']} ({p['speaker']})...")
            try:
                raw_bytes = sarvam_svc.text_to_speech(
                    text=p["voice_transcript"],
                    language_code=p["language_code"],
                    speaker=p["speaker"],
                    model="bulbul:v3"
                )
                target_path.write_bytes(raw_bytes)
                print(f"Saved {target_path} ({len(raw_bytes)} bytes)")
            except Exception as e:
                print(f"Error generating audio for {p['name']}: {e}")

if __name__ == "__main__":
    svc = SarvamService()
    generate_profile_audios(svc)
