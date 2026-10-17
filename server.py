import os
import json
import uuid
import base64
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from sarvam_service import SarvamService
from sample_profiles import PROFILES, generate_profile_audios

app = FastAPI(title="Suno - Voice-First Campus Dating for IIIT-H", version="2.0.0")

# Mount static folder
static_path = Path(__file__).parent / "static"
static_path.mkdir(exist_ok=True)
(static_path / "audio").mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

sarvam_svc = SarvamService()

# Global in-memory state for user session
user_session = {
    "verified": True,
    "user_id": "current_user",
    "name": "Arjun Mehta",
    "pseudonym": "Vindhya Chai Theorist",
    "email": "arjun.mehta@students.iiit.ac.in",
    "branch": "CSE 3rd Year",
    "roll_no": "2022101007",
    "prompt_question": "Pitch your Felicity plan",
    "voice_transcript": "Bhai kal Felicity concert me LitC ke saath scene banate hain, aur raat ko Tantra me pakka chai peeyenge.",
    "audio_file": "/static/audio/user_default.wav",
    "speaker": "kabir",
    "language_code": "hi-IN",
    "vibe": "Seamless Hinglish Flow",
    "revealed_matches": set()
}

class VerifyIDRequest(BaseModel):
    email: str
    student_name: Optional[str] = ""
    branch: Optional[str] = "CSE"
    roll_no: Optional[str] = ""

class MatchCompareRequest(BaseModel):
    user_transcript: Optional[str] = None
    target_profile_id: str

class IcebreakerRequest(BaseModel):
    target_profile_id: str

class IcebreakerRebuttalRequest(BaseModel):
    topic: str
    user_transcript: str
    target_profile_id: str

class TranslateSpeakRequest(BaseModel):
    text: str
    source_lang: str = "hi-IN"
    target_lang: str = "te-IN"
    target_speaker: str = "kavitha"

class KiviFormatRequest(BaseModel):
    speech_text: str
    tone: str = "campus_chill"

class RevealToggleRequest(BaseModel):
    target_profile_id: str

@app.on_event("startup")
def startup_event():
    try:
        generate_profile_audios(sarvam_svc)
    except Exception as e:
        print("Startup audio generation note:", e)

@app.get("/")
def serve_index():
    index_file = static_path / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "Suno API running."}

@app.get("/api/me")
def get_current_user():
    fp = sarvam_svc.analyze_language_fingerprint(user_session["voice_transcript"], include_ai_reasoning=False)
    return {
        "user": user_session,
        "language_fingerprint": fp
    }

@app.get("/api/profiles")
def get_profiles():
    enriched = []
    user_transcript = user_session["voice_transcript"]

    for p in PROFILES:
        is_revealed = p["id"] in user_session["revealed_matches"]
        match_stats = sarvam_svc.analyze_language_fingerprint(user_transcript, p["voice_transcript"], include_ai_reasoning=False)

        enriched.append({
            "id": p["id"],
            "blind_mode": not is_revealed,
            "pseudonym": p["pseudonym"],
            "name": p["name"] if is_revealed else p["pseudonym"],
            "email": p["email"] if is_revealed else "iiit-verified@students.iiit.ac.in",
            "branch": p["branch"],
            "hostel": p["hostel"] if is_revealed else "Campus Hostel",
            "batch": p["batch"],
            "verified": p["verified"],
            "prompt_question": p["prompt_question"],
            "voice_transcript": p["voice_transcript"],
            "audio_file": p["audio_file"],
            "campus_vibe": p["campus_vibe"],
            "hobbies": p["hobbies"],
            "language_match": match_stats,
            "is_revealed": is_revealed
        })
    return enriched

@app.post("/api/record-bio")
async def record_voice_bio(file: UploadFile = File(...)):
    """
    Live Microphone Ingestion:
    Receives real audio recorded in the browser, transcribes it with Sarvam Saaras STT (codemix),
    and analyzes it with Sarvam 105B to generate persona and language fingerprint.
    """
    ext = file.filename.split(".")[-1] if "." in file.filename else "webm"
    temp_filename = f"user_{uuid.uuid4().hex[:8]}.{ext}"
    temp_path = static_path / "audio" / temp_filename

    content = await file.read()
    temp_path.write_bytes(content)

    # 1. Real Sarvam Saaras STT
    stt_res = sarvam_svc.speech_to_text(temp_path, model="saaras:v4", mode="codemix")
    transcript = stt_res.get("transcript", "")
    if not transcript:
        stt_res_v3 = sarvam_svc.speech_to_text(temp_path, model="saaras:v3", mode="codemix")
        transcript = stt_res_v3.get("transcript", "")

    if not transcript:
        transcript = "Kal shaam ko Tantra me chai peene chalte hain, Felicity project discuss karenge."

    # 2. Real Sarvam 105B Persona Generation
    persona = sarvam_svc.generate_voice_bio_persona(transcript)

    user_session["voice_transcript"] = transcript
    user_session["audio_file"] = f"/static/audio/{temp_filename}"
    user_session["pseudonym"] = persona.get("pseudonym", user_session["pseudonym"])
    user_session["vibe"] = persona.get("vibe_summary", user_session["vibe"])

    # 3. Compute Language Fingerprint
    fp = sarvam_svc.analyze_language_fingerprint(transcript, include_ai_reasoning=True)

    return {
        "success": True,
        "transcript": transcript,
        "audio_url": user_session["audio_file"],
        "persona": persona,
        "fingerprint": fp
    }

@app.post("/api/kivi/voice-dictate")
async def kivi_voice_dictate(file: UploadFile = File(...), tone: str = Form("campus_chill")):
    """
    Real Kivi Voice Studio:
    Transcribes raw user speech via Saaras STT, transforms tone with Sarvam-105B,
    and synthesizes speech audio preview with Sarvam Bulbul TTS.
    """
    content = await file.read()
    res = sarvam_svc.kivi_voice_pipeline(audio_bytes=content, tone=tone)
    return res

@app.post("/api/kivi/format")
def kivi_format(req: KiviFormatRequest):
    """Kivi text tone formatter."""
    res = sarvam_svc.kivi_format(raw_dictation=req.speech_text, tone=req.tone)
    # Also generate Bulbul TTS audio for preview
    audio_b64 = None
    try:
        raw_tts = sarvam_svc.text_to_speech(
            text=res.get("formatted_message", req.speech_text),
            language_code="hi-IN" if any(ord(c) > 127 for c in res.get("formatted_message", "")) else "en-IN",
            speaker="kavya",
            model="bulbul:v3"
        )
        audio_b64 = base64.b64encode(raw_tts).decode("ascii")
    except Exception as e:
        print("TTS format error:", e)

    res["audio_base64"] = audio_b64
    return res

@app.post("/api/match/compare")
def compare_match(req: MatchCompareRequest):
    user_text = req.user_transcript or user_session["voice_transcript"]
    target_profile = next((p for p in PROFILES if p["id"] == req.target_profile_id), None)
    if not target_profile:
        raise HTTPException(status_code=404, detail="Target profile not found")

    res = sarvam_svc.analyze_language_fingerprint(user_text, target_profile["voice_transcript"], include_ai_reasoning=True)
    return {
        "target_profile": {
            "id": target_profile["id"],
            "pseudonym": target_profile["pseudonym"],
            "name": target_profile["name"] if target_profile["id"] in user_session["revealed_matches"] else target_profile["pseudonym"],
            "audio_file": target_profile["audio_file"]
        },
        "match_details": res
    }

@app.post("/api/arena/compare-voices")
async def arena_compare_voices(
    audio_1: Optional[UploadFile] = File(None),
    audio_2: Optional[UploadFile] = File(None),
    text_1: Optional[str] = Form(None),
    text_2: Optional[str] = Form(None)
):
    """
    Voice Match Arena:
    Accepts two live recorded voices (e.g. Judge 1 vs Judge 2 or User vs Match),
    transcribes both with Saaras STT, calculates code-switch synergy,
    and runs Sarvam 105B deep matchmaking analysis.
    """
    # Transcribe 1
    t1 = text_1 or ""
    if audio_1 and not t1:
        c1 = await audio_1.read()
        stt_1 = sarvam_svc.speech_to_text(c1, model="saaras:v4", mode="codemix")
        t1 = stt_1.get("transcript", "")

    # Transcribe 2
    t2 = text_2 or ""
    if audio_2 and not t2:
        c2 = await audio_2.read()
        stt_2 = sarvam_svc.speech_to_text(c2, model="saaras:v4", mode="codemix")
        t2 = stt_2.get("transcript", "")

    if not t1:
        t1 = "Bhai kal Felicity cultural night me front row moshpit me chalte hain, Tantra me chai peeyenge."
    if not t2:
        t2 = "Kadamba South mess dosa on Sunday mornings is pure emotion, embedded systems assignment submit chesi sleep vedham."

    match_analysis = sarvam_svc.analyze_language_fingerprint(t1, t2, include_ai_reasoning=True)

    return {
        "transcript_1": t1,
        "transcript_2": t2,
        "match_analysis": match_analysis
    }

@app.post("/api/icebreaker/initiate")
def initiate_icebreaker(req: IcebreakerRequest):
    target_profile = next((p for p in PROFILES if p["id"] == req.target_profile_id), PROFILES[0])
    
    current_p = {
        "name": user_session["name"],
        "branch": user_session["branch"],
        "voice_transcript": user_session["voice_transcript"]
    }
    target_p = {
        "name": target_profile["name"],
        "branch": target_profile["branch"],
        "voice_transcript": target_profile["voice_transcript"]
    }

    icebreaker_res = sarvam_svc.run_icebreaker_agent(current_p, target_p)
    return icebreaker_res

@app.post("/api/icebreaker/rebuttal")
async def icebreaker_rebuttal(
    target_profile_id: str = Form("profile_sneha"),
    topic: str = Form("The Great IIIT-H Food & All-Nighter Debate"),
    user_transcript: Optional[str] = Form(None),
    audio_file: Optional[UploadFile] = File(None)
):
    """
    Live Interactive Debate Round:
    Accepts user's real spoken rebuttal or text, transcribes it,
    has Sarvam 105B score their argument, generate match's comeback,
    and synthesizes speech via Sarvam Bulbul TTS with real-time translation!
    """
    text = user_transcript or ""
    if audio_file:
        raw_audio = await audio_file.read()
        stt_res = sarvam_svc.speech_to_text(raw_audio, model="saaras:v4", mode="codemix")
        text = stt_res.get("transcript", text)

    if not text:
        text = "Kadamba sambar is good, but 2 AM Tantra maggi saves lives during OS lab submissions!"

    target_profile = next((p for p in PROFILES if p["id"] == target_profile_id), PROFILES[0])
    res = sarvam_svc.interactive_icebreaker_turn(topic, text, target_profile)
    return res

@app.post("/api/icebreaker/translate-speak")
def translate_and_speak(req: TranslateSpeakRequest):
    trans_res = sarvam_svc.translate(
        text=req.text,
        source_lang=req.source_lang,
        target_lang=req.target_lang
    )
    translated_text = trans_res.get("translated_text", req.text)

    audio_b64 = None
    try:
        audio_bytes = sarvam_svc.text_to_speech(
            text=translated_text,
            language_code=req.target_lang,
            speaker=req.target_speaker,
            model="bulbul:v3"
        )
        audio_b64 = base64.b64encode(audio_bytes).decode("ascii")
    except Exception as e:
        print("TTS translation audio error:", e)

    return {
        "original_text": req.text,
        "translated_text": translated_text,
        "source_lang": req.source_lang,
        "target_lang": req.target_lang,
        "audio_base64": audio_b64
    }

@app.post("/api/verify-id-card")
async def verify_id_card(file: UploadFile = File(...)):
    """
    Real Sarvam Document AI OCR & ID Verification:
    Reads an uploaded student ID card image (PNG/JPEG/PDF),
    submits to Sarvam Doc AI digitisation job, polls status,
    and runs Sarvam 105B validation on the extracted text.
    """
    content = await file.read()
    res = sarvam_svc.digitise_id_document(content, filename=file.filename)
    
    if res["success"]:
        extracted = res["structured_data"]
        user_session["verified"] = True
        user_session["name"] = extracted.get("student_name", user_session["name"])
        user_session["email"] = extracted.get("email", user_session["email"])
        user_session["branch"] = extracted.get("branch", user_session["branch"])
        user_session["roll_no"] = extracted.get("roll_no", user_session["roll_no"])

    return res

@app.post("/api/verify-id")
def verify_id_manual(req: VerifyIDRequest):
    res = sarvam_svc.verify_student_id(
        email=req.email,
        student_name=req.student_name,
        branch=req.branch,
        roll_no=req.roll_no
    )
    if res["verified"]:
        user_session["verified"] = True
        user_session["email"] = req.email
        user_session["name"] = res["student_name"]
        user_session["pseudonym"] = res["blind_pseudonym"]
        user_session["branch"] = req.branch
        user_session["roll_no"] = req.roll_no
    return res

@app.post("/api/safety/toggle-reveal")
def toggle_reveal(req: RevealToggleRequest):
    pid = req.target_profile_id
    if pid in user_session["revealed_matches"]:
        user_session["revealed_matches"].remove(pid)
        revealed = False
    else:
        user_session["revealed_matches"].add(pid)
        revealed = True

    target_profile = next((p for p in PROFILES if p["id"] == pid), None)
    return {
        "target_profile_id": pid,
        "is_revealed": revealed,
        "unlocked_name": target_profile["name"] if (target_profile and revealed) else None,
        "unlocked_avatar": target_profile["avatar"] if (target_profile and revealed) else None
    }

@app.post("/api/demo/stage-scenario")
def run_stage_scenario():
    """90-Second Demo Showcase Endpoint for Stage & Judges."""
    speaker_a_text = "Bhai simple funda hai. LitC debate me participate karenge, cultural night me front row moshpit, aur raat ko teen baje Tantra me maggi aur chai. Agar code submit ho gaya toh hi soenge."
    speaker_b_text = "Honestly, anyone who slanders Kadamba South mess dosa on Sunday mornings has never pulled an all-nighter for Embedded Systems. Yuktahar is healthy, fine, but Kadamba sambar is pure emotion."

    match_res = sarvam_svc.analyze_language_fingerprint(speaker_a_text, speaker_b_text, include_ai_reasoning=True)

    profile_a = {"name": "Kabir", "branch": "CSE", "voice_transcript": speaker_a_text}
    profile_b = {"name": "Sneha", "branch": "ECE", "voice_transcript": speaker_b_text}
    icebreaker = sarvam_svc.run_icebreaker_agent(profile_a, profile_b)

    sample_dialogue_hindi = "Bhai sach me Kadamba ka sambhar aur Tantra ki chai dono solid hai."
    trans_res = sarvam_svc.translate(sample_dialogue_hindi, source_lang="hi-IN", target_lang="te-IN")
    
    te_audio_b64 = None
    try:
        te_bytes = sarvam_svc.text_to_speech(
            text=trans_res.get("translated_text", sample_dialogue_hindi),
            language_code="te-IN",
            speaker="kavitha",
            model="bulbul:v3"
        )
        te_audio_b64 = base64.b64encode(te_bytes).decode("ascii")
    except Exception as e:
        print("Stage demo te audio error:", e)

    kivi_res = sarvam_svc.kivi_format(
        raw_dictation="yaar sun kal shaam ko milte hai tantra pe chill karenge thoda",
        tone="campus_chill"
    )

    return {
        "step_1_speaker_a": {
            "name": "Kabir (Hinglish Speaker)",
            "audio_file": "/static/audio/kabir.wav",
            "transcript": speaker_a_text,
            "badge": "Seamless Hinglish Flow"
        },
        "step_2_speaker_b": {
            "name": "Sneha (Tenglish Speaker)",
            "audio_file": "/static/audio/sneha.wav",
            "transcript": speaker_b_text,
            "badge": "Tenglish Campus Techie"
        },
        "step_3_language_match": match_res,
        "step_4_ai_icebreaker": icebreaker,
        "step_5_live_translation": {
            "original_hindi": sample_dialogue_hindi,
            "translated_telugu": trans_res.get("translated_text"),
            "telugu_audio_base64": te_audio_b64
        },
        "step_6_kivi_power": kivi_res
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
