// Suno Production Engine
let state = {
  profiles: [],
  currentIndex: 0,
  isPlaying: false,
  kiviTone: 'campus_chill',
  currentUser: null,
  hostAudio: null,
  activeRebuttalTopic: "The Great IIIT-H Food & All-Nighter Debate"
};

// Web Audio & Recording Globals
let mediaRecorder = null;
let recordedAudioChunks = [];
let recordInterval = null;
let recordSeconds = 0;
let audioContext = null;
let analyserNode = null;
let micStream = null;

const audioPlayer = document.getElementById('global-audio-player');
const deckWaveformCanvas = document.getElementById('card-waveform');
const deckWaveCtx = deckWaveformCanvas ? deckWaveformCanvas.getContext('2d') : null;
let deckWaveAnimId = null;

document.addEventListener('DOMContentLoaded', async () => {
  initDeckWaveformCanvas();
  await loadCurrentUser();
  await loadProfiles();
});

function initDeckWaveformCanvas() {
  if (!deckWaveformCanvas) return;
  deckWaveformCanvas.width = deckWaveformCanvas.parentElement?.clientWidth || 300;
  deckWaveformCanvas.height = 44;
  drawStaticWaveform();
}

function drawStaticWaveform() {
  if (!deckWaveCtx || !deckWaveformCanvas) return;
  deckWaveCtx.clearRect(0, 0, deckWaveformCanvas.width, deckWaveformCanvas.height);
  const bars = 36;
  const barWidth = 4;
  const gap = (deckWaveformCanvas.width - bars * barWidth) / (bars - 1);

  for (let i = 0; i < bars; i++) {
    const x = i * (barWidth + gap);
    const height = 8 + Math.sin(i * 0.4) * 10 + Math.cos(i * 0.7) * 8;
    const y = (deckWaveformCanvas.height - height) / 2;
    deckWaveCtx.fillStyle = state.isPlaying ? '#ff6b35' : 'rgba(255, 255, 255, 0.2)';
    deckWaveCtx.beginPath();
    deckWaveCtx.roundRect(x, y, barWidth, height, 2);
    deckWaveCtx.fill();
  }
}

function startWaveformAnimation() {
  if (deckWaveAnimId) cancelAnimationFrame(deckWaveAnimId);
  function render() {
    if (!state.isPlaying) {
      drawStaticWaveform();
      return;
    }
    if (deckWaveCtx && deckWaveformCanvas) {
      deckWaveCtx.clearRect(0, 0, deckWaveformCanvas.width, deckWaveformCanvas.height);
      const bars = 36;
      const barWidth = 4;
      const gap = (deckWaveformCanvas.width - bars * barWidth) / (bars - 1);
      const time = Date.now() * 0.008;

      for (let i = 0; i < bars; i++) {
        const x = i * (barWidth + gap);
        const dynamicH = 10 + Math.abs(Math.sin(time + i * 0.3) * 24);
        const y = (deckWaveformCanvas.height - dynamicH) / 2;

        const grad = deckWaveCtx.createLinearGradient(0, y, 0, y + dynamicH);
        grad.addColorStop(0, '#ff9966');
        grad.addColorStop(1, '#ff5e62');

        deckWaveCtx.fillStyle = grad;
        deckWaveCtx.beginPath();
        deckWaveCtx.roundRect(x, y, barWidth, dynamicH, 2);
        deckWaveCtx.fill();
      }
    }
    deckWaveAnimId = requestAnimationFrame(render);
  }
  render();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerText = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3800);
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) targetTab.classList.add('active');

  document.querySelectorAll('.tab-btn').forEach(b => {
    if (b.getAttribute('onclick')?.includes(tabId)) {
      b.classList.add('active');
    }
  });

  if (tabId === 'icebreaker' && state.profiles.length > 0) {
    initIcebreakerForActiveProfile();
  }
}

// ==========================================
// PROFILES & DECK LOGIC
// ==========================================
async function loadCurrentUser() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    state.currentUser = data.user;
    const badgeEl = document.getElementById('current-user-pseudonym');
    if (badgeEl && state.currentUser) {
      badgeEl.innerText = `🎭 ${state.currentUser.pseudonym}`;
    }
  } catch (err) {
    console.error('Failed to load current user', err);
  }
}

async function loadProfiles() {
  try {
    const res = await fetch('/api/profiles');
    const data = await res.json();
    state.profiles = data;
    renderCurrentProfile();
  } catch (err) {
    console.error('Failed to load profiles', err);
  }
}

function renderCurrentProfile() {
  if (!state.profiles || state.profiles.length === 0) return;
  const p = state.profiles[state.currentIndex];

  document.getElementById('profile-counter').innerText = `${state.currentIndex + 1} of ${state.profiles.length}`;
  
  const avatarWrapper = document.getElementById('card-avatar-wrapper');
  const avatarImg = document.getElementById('card-avatar-img');
  const pseudonymEl = document.getElementById('card-pseudonym');
  const branchEl = document.getElementById('card-branch');
  const campusVibeEl = document.getElementById('card-campus-vibe');
  const questionEl = document.getElementById('card-prompt-question');
  const transcriptEl = document.getElementById('card-transcript');
  const synergyBadgeEl = document.getElementById('card-synergy-badge');
  const rhythmBadgeEl = document.getElementById('card-rhythm-badge');
  const reasoningEl = document.getElementById('card-match-reasoning');
  const revealBtn = document.getElementById('btn-reveal-toggle');

  if (p.is_revealed) {
    avatarWrapper.classList.remove('blurred');
    pseudonymEl.innerText = `${p.name} (${p.pseudonym})`;
    revealBtn.innerText = '🔒 Mask Photo';
    revealBtn.style.background = 'rgba(46, 213, 115, 0.2)';
    revealBtn.style.color = '#2ed573';
  } else {
    avatarWrapper.classList.add('blurred');
    pseudonymEl.innerText = `🎭 ${p.pseudonym}`;
    revealBtn.innerText = '🔓 Mutual Reveal';
    revealBtn.style.background = '';
    revealBtn.style.color = '';
  }

  avatarImg.src = `/static/avatars/${p.id.replace('profile_', '')}.svg`;
  branchEl.innerText = `${p.branch} • ${p.batch}`;
  campusVibeEl.innerText = p.campus_vibe;
  questionEl.innerText = `"${p.prompt_question}"`;
  transcriptEl.innerText = `"${p.voice_transcript}"`;

  const lm = p.language_match;
  if (lm) {
    synergyBadgeEl.innerText = `🔥 ${lm.synergy_percentage}% Synergy`;
    rhythmBadgeEl.innerText = lm.synergy_type || 'Indic Flow Bridge';
    reasoningEl.innerText = `Sarvam AI Insight: "${lm.sarvam_ai_reasoning || 'Strong campus conversational chemistry.'}"`;
  }

  if (state.isPlaying) {
    audioPlayer.pause();
    state.isPlaying = false;
    document.getElementById('card-play-btn').innerText = '▶';
    drawStaticWaveform();
  }
}

function nextProfile(direction = 1) {
  if (state.profiles.length === 0) return;
  state.currentIndex = (state.currentIndex + direction + state.profiles.length) % state.profiles.length;
  renderCurrentProfile();
}

function togglePlayActiveCard() {
  if (!state.profiles || state.profiles.length === 0) return;
  const p = state.profiles[state.currentIndex];
  const btn = document.getElementById('card-play-btn');

  if (state.isPlaying) {
    audioPlayer.pause();
    state.isPlaying = false;
    btn.innerText = '▶';
    drawStaticWaveform();
  } else {
    audioPlayer.src = p.audio_file;
    audioPlayer.play().then(() => {
      state.isPlaying = true;
      btn.innerText = '⏸';
      startWaveformAnimation();
    }).catch(e => {
      console.error(e);
      showToast('Click anywhere or check browser audio permissions');
    });

    audioPlayer.onended = () => {
      state.isPlaying = false;
      btn.innerText = '▶';
      drawStaticWaveform();
    };

    audioPlayer.ontimeupdate = () => {
      const cur = Math.floor(audioPlayer.currentTime);
      const dur = Math.floor(audioPlayer.duration || 15);
      const timeEl = document.getElementById('card-audio-time');
      if (timeEl) {
        timeEl.innerText = `0:${cur < 10 ? '0' + cur : cur} / 0:${dur < 10 ? '0' + dur : dur}`;
      }
    };
  }
}

async function toggleMutualReveal() {
  if (!state.profiles || state.profiles.length === 0) return;
  const p = state.profiles[state.currentIndex];

  try {
    const res = await fetch('/api/safety/toggle-reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_profile_id: p.id })
    });
    const data = await res.json();
    p.is_revealed = data.is_revealed;
    renderCurrentProfile();
    showToast(data.is_revealed ? `🔓 Mutual Reveal approved! Identity unmasked.` : `🔒 Masked again for privacy.`);
  } catch (e) {
    console.error(e);
  }
}

function enterMatchLounge() {
  switchTab('icebreaker');
}

// ==========================================
// 🎙️ REAL LIVE MICROPHONE RECORDING MODAL
// ==========================================
let modalRecording = false;
let recordedBioBlob = null;
let micAnimId = null;

function openLiveRecordModal() {
  const modal = document.getElementById('live-record-modal');
  modal.style.display = 'flex';
  document.getElementById('record-status').innerText = 'Ready to record';
  document.getElementById('record-timer').innerText = '00:00';
  document.getElementById('btn-toggle-record').innerText = '🔴 Start Recording';
  document.getElementById('btn-submit-record').style.display = 'none';
  modalRecording = false;
  recordedAudioChunks = [];
}

function closeLiveRecordModal() {
  if (modalRecording) stopLiveRecording();
  document.getElementById('live-record-modal').style.display = 'none';
  if (micAnimId) cancelAnimationFrame(micAnimId);
}

async function toggleLiveRecording() {
  if (!modalRecording) {
    await startLiveRecording();
  } else {
    stopLiveRecording();
  }
}

async function startLiveRecording() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyserNode = audioContext.createAnalyser();
    const sourceNode = audioContext.createMediaStreamSource(micStream);
    sourceNode.connect(analyserNode);
    analyserNode.fftSize = 64;

    mediaRecorder = new MediaRecorder(micStream);
    recordedAudioChunks = [];

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) recordedAudioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      recordedBioBlob = new Blob(recordedAudioChunks, { type: 'audio/webm' });
      document.getElementById('btn-submit-record').style.display = 'block';
      document.getElementById('record-status').innerText = `Recorded ${recordSeconds}s. Click Transcribe!`;
      showToast('Recording stopped. Ready to transcribe with Sarvam Saaras.');
    };

    mediaRecorder.start();
    modalRecording = true;
    recordSeconds = 0;
    document.getElementById('btn-toggle-record').innerText = '⏹ Stop Recording';
    document.getElementById('record-status').innerText = 'Recording in progress...';

    recordInterval = setInterval(() => {
      recordSeconds++;
      const s = recordSeconds < 10 ? '0' + recordSeconds : recordSeconds;
      document.getElementById('record-timer').innerText = `00:${s}`;
      if (recordSeconds >= 30) stopLiveRecording();
    }, 1000);

    drawMicSpectrum();

  } catch (err) {
    console.error('Mic access error:', err);
    showToast('Microphone access denied or not available');
  }
}

function stopLiveRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (recordInterval) clearInterval(recordInterval);
  if (micStream) micStream.getTracks().forEach(t => t.stop());
  if (audioContext && audioContext.state !== 'closed') audioContext.close();
  if (micAnimId) cancelAnimationFrame(micAnimId);

  modalRecording = false;
  document.getElementById('btn-toggle-record').innerText = '🔴 Re-Record';
}

function drawMicSpectrum() {
  const canvas = document.getElementById('live-mic-canvas');
  if (!canvas || !analyserNode) return;
  const ctx = canvas.getContext('2d');
  const bufferLen = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLen);

  function render() {
    if (!modalRecording) return;
    micAnimId = requestAnimationFrame(render);
    analyserNode.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / bufferLen) * 2;
    let x = 0;

    for (let i = 0; i < bufferLen; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height;
      const grad = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
      grad.addColorStop(0, '#ff4757');
      grad.addColorStop(1, '#ff6b81');

      ctx.fillStyle = grad;
      ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
      x += barWidth;
    }
  }
  render();
}

async function submitLiveVoiceBio() {
  if (!recordedBioBlob) return;
  const btn = document.getElementById('btn-submit-record');
  btn.disabled = true;
  btn.innerText = '⏳ Transcribing with Sarvam Saaras...';

  try {
    const formData = new FormData();
    formData.append('file', recordedBioBlob, 'live_voice_bio.webm');

    const res = await fetch('/api/record-bio', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    closeLiveRecordModal();
    showToast(`✨ Transcribed: "${data.transcript.slice(0, 45)}..."`);

    // Reload state
    await loadCurrentUser();
    await loadProfiles();

  } catch (err) {
    console.error(err);
    showToast('Failed to transcribe live voice bio.');
  } finally {
    btn.disabled = false;
    btn.innerText = '🚀 Transcribe with Saaras';
  }
}

// ==========================================
// ⚔️ DUAL-VOICE MATCH ARENA
// ==========================================
let arenaRecordingNum = null;
let arenaBlob1 = null;
let arenaBlob2 = null;

async function recordArenaSpeaker(num) {
  const btn = document.getElementById(`arena-mic-${num}`);
  if (arenaRecordingNum === num) {
    // Stop recording
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    arenaRecordingNum = null;
    btn.innerText = `🎙️ Record Speaker ${num} Live`;
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      if (num === 1) arenaBlob1 = blob;
      else arenaBlob2 = blob;
      showToast(`Speaker ${num} voice recorded!`);
    };

    mediaRecorder.start();
    arenaRecordingNum = num;
    btn.innerText = `⏹ Stop Recording Speaker ${num}`;
    showToast(`Recording Speaker ${num}... Speak in Hinglish or Tenglish!`);

  } catch (e) {
    showToast('Microphone access not available');
  }
}

async function runArenaComparison() {
  const btn = document.getElementById('btn-run-arena');
  btn.disabled = true;
  btn.innerText = '⏳ Running Sarvam Saaras STT + 105B Matchmaker...';

  const t1 = document.getElementById('arena-text-1').value.trim();
  const t2 = document.getElementById('arena-text-2').value.trim();

  const formData = new FormData();
  if (arenaBlob1) formData.append('audio_1', arenaBlob1, 'speaker1.webm');
  if (arenaBlob2) formData.append('audio_2', arenaBlob2, 'speaker2.webm');
  formData.append('text_1', t1);
  formData.append('text_2', t2);

  try {
    const res = await fetch('/api/arena/compare-voices', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    const ma = data.match_analysis;

    const box = document.getElementById('arena-results-box');
    box.style.display = 'block';
    box.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
        <span style="font-size: 18px; font-weight: 800; color: #2ed573;">${ma.synergy_badge}</span>
        <span style="font-size: 13px; font-weight: 600; color: #ffd32a;">${ma.synergy_type}</span>
      </div>
      
      <div style="margin-top: 14px; font-size: 14px; color: #fff; line-height: 1.5; background: rgba(255,255,255,0.04); padding: 14px; border-radius: 8px;">
        <strong style="color: var(--accent-saffron);">Sarvam-105B Matchmaking Thesis:</strong><br>
        "${ma.sarvam_ai_reasoning}"
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 16px;">
        <div style="background: rgba(255,107,53,0.06); border: 1px solid rgba(255,107,53,0.25); border-radius: 8px; padding: 12px; font-size: 12px;">
          <strong style="color: var(--accent-saffron);">Speaker 1 Linguistic Profile</strong>
          <div style="margin-top: 4px;">Transcript: "${data.transcript_1}"</div>
          <div style="margin-top: 4px;">Rhythm: <strong>${ma.speaker_a_stats.vibe_label}</strong></div>
          <div>Code-Mix Density: <strong>${ma.speaker_a_stats.indic_code_mix_percent}% Indic</strong></div>
          <div>Campus Lore: ${ma.speaker_a_stats.campus_slang_words.join(', ') || 'General campus'}</div>
        </div>

        <div style="background: rgba(46,213,115,0.06); border: 1px solid rgba(46,213,115,0.25); border-radius: 8px; padding: 12px; font-size: 12px;">
          <strong style="color: var(--accent-cyan);">Speaker 2 Linguistic Profile</strong>
          <div style="margin-top: 4px;">Transcript: "${data.transcript_2}"</div>
          <div style="margin-top: 4px;">Rhythm: <strong>${ma.speaker_b_stats.vibe_label}</strong></div>
          <div>Code-Mix Density: <strong>${ma.speaker_b_stats.indic_code_mix_percent}% Indic</strong></div>
          <div>Campus Lore: ${ma.speaker_b_stats.campus_slang_words.join(', ') || 'General campus'}</div>
        </div>
      </div>
    `;
    box.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error(err);
    showToast('Failed to evaluate dual-voice match.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '⚡ Calculate Live Language Synergy (Sarvam Saaras + 105B)';
  }
}

// ==========================================
// 💬 AI ICEBREAKER MULTI-TURN VOICE CALL
// ==========================================
let rebuttalMicActive = false;
let rebuttalBlob = null;

async function initIcebreakerForActiveProfile() {
  if (!state.profiles || state.profiles.length === 0) return;
  const p = state.profiles[state.currentIndex];
  document.getElementById('chat-partner-name').innerText = `${p.pseudonym} (${p.branch})`;

  try {
    const res = await fetch('/api/icebreaker/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_profile_id: p.id })
    });
    const data = await res.json();
    document.getElementById('icebreaker-topic').innerText = data.icebreaker.topic;
    document.getElementById('icebreaker-script').innerText = data.host_script;
    state.hostAudio = data.host_audio_base64;
    state.activeRebuttalTopic = data.icebreaker.topic;
  } catch (err) {
    console.error(err);
  }
}

function playHostAudio() {
  if (state.hostAudio) {
    playBase64Audio(state.hostAudio);
  } else {
    showToast('Host audio not available');
  }
}

async function toggleRebuttalMic() {
  const btn = document.getElementById('rebuttal-mic-btn');
  if (rebuttalMicActive) {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    rebuttalMicActive = false;
    btn.innerText = '🎙️ Mic';
    btn.style.background = '';
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      rebuttalBlob = new Blob(chunks, { type: 'audio/webm' });
      document.getElementById('rebuttal-input').value = '[Voice Defense Recorded - Ready to Submit]';
      showToast('Voice rebuttal captured! Click Submit.');
    };

    mediaRecorder.start();
    rebuttalMicActive = true;
    btn.innerText = '⏹ Stop';
    btn.style.background = '#ff4757';
    showToast('Recording defense into mic... Speak for up to 15 seconds!');

  } catch (e) {
    showToast('Microphone access denied');
  }
}

async function submitRebuttal() {
  const currentP = state.profiles[state.currentIndex] || { id: 'profile_sneha' };
  const topic = state.activeRebuttalTopic || 'The Great IIIT-H Food & All-Nighter Debate';
  const inputVal = document.getElementById('rebuttal-input').value.trim();

  const formData = new FormData();
  formData.append('target_profile_id', currentP.id);
  formData.append('topic', topic);
  if (rebuttalBlob) {
    formData.append('audio_file', rebuttalBlob, 'rebuttal.webm');
  } else {
    formData.append('user_transcript', inputVal);
  }

  showToast('⏳ Submitting to Sarvam Saaras STT + 105B...');

  try {
    const res = await fetch('/api/icebreaker/rebuttal', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    const box = document.getElementById('rebuttal-result-box');
    box.style.display = 'block';
    box.innerHTML = `
      <div style="font-weight: 700; color: #2ed573;">AI Moderator Score: ${data.moderator_rating}</div>
      <div style="margin-top: 6px; font-size: 13px; color: #fff;">
        <strong>${currentP.name}'s Rebuttal:</strong> "${data.match_rebuttal}"
      </div>
      <div style="margin-top: 4px; font-size: 12px; color: #ffd32a;">
        <strong>Live Telugu/Hindi Translation:</strong> "${data.match_rebuttal_translated}"
      </div>
      <button class="tab-btn" style="margin-top: 8px; background: rgba(255,255,255,0.08); font-size: 11px;" onclick="playBase64Audio('${data.match_audio_base64}')">
        🔊 Hear ${currentP.name}'s Voice (Bulbul TTS)
      </button>
    `;

    // Append to chat
    const chatContainer = document.getElementById('chat-messages-container');
    const msgThem = document.createElement('div');
    msgThem.className = 'chat-msg them';
    msgThem.innerHTML = `
      <div>"${data.match_rebuttal}"</div>
      <div class="translation-subtext">
        <span>Translated: "${data.match_rebuttal_translated}"</span>
        <button onclick="playBase64Audio('${data.match_audio_base64}')" style="background:none; border:none; color:#ffd32a; cursor:pointer;">🔊</button>
      </div>
    `;
    chatContainer.appendChild(msgThem);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (data.match_audio_base64) {
      playBase64Audio(data.match_audio_base64);
    }

  } catch (err) {
    console.error(err);
    showToast('Failed to process rebuttal turn.');
  }
}

async function runLiveTranslate() {
  const inputVal = document.getElementById('translate-input').value.trim();
  if (!inputVal) return;

  const outEl = document.getElementById('translate-output');
  outEl.innerText = 'Translating via Sarvam...';

  try {
    const res = await fetch('/api/icebreaker/translate-speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: inputVal,
        source_lang: 'hi-IN',
        target_lang: 'te-IN',
        target_speaker: 'kavitha'
      })
    });
    const data = await res.json();
    outEl.innerText = `Telugu: "${data.translated_text}"`;
    if (data.audio_base64) {
      playBase64Audio(data.audio_base64);
    }
  } catch (err) {
    console.error(err);
    outEl.innerText = 'Translation failed';
  }
}

// ==========================================
// ✨ KIVI VOICE STUDIO & CHAT BAR
// ==========================================
let studioMicActive = false;
let studioAudioBlob = null;
let currentStudioTone = 'campus_chill';

function setStudioTone(tone) {
  currentStudioTone = tone;
  document.querySelectorAll('.kivi-tone-chip').forEach(c => c.classList.remove('active'));
  const target = document.getElementById(`studio-tone-${tone}`);
  if (target) target.classList.add('active');
}

function setKiviTone(tone, elem) {
  state.kiviTone = tone;
  document.querySelectorAll('.kivi-tones .kivi-tone-chip').forEach(c => c.classList.remove('active'));
  elem.classList.add('active');
}

async function toggleStudioMic() {
  const btn = document.getElementById('studio-mic-btn');
  if (studioMicActive) {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    studioMicActive = false;
    btn.innerText = '🎙️ Speak to Mic (Saaras STT)';
    btn.style.background = '';
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      studioAudioBlob = new Blob(chunks, { type: 'audio/webm' });
      document.getElementById('studio-speech-input').value = '[Spoken Voice Captured - Ready to Format]';
      showToast('Voice recorded! Running Sarvam Saaras STT & Kivi...');
      runKiviStudioWithAudio();
    };

    mediaRecorder.start();
    studioMicActive = true;
    btn.innerText = '⏹ Stop Dictating';
    btn.style.background = '#ff4757';
    showToast('Dictating hands-free... Speak in Hinglish or Tenglish!');

  } catch (e) {
    showToast('Microphone access denied');
  }
}

async function runKiviStudioWithAudio() {
  if (!studioAudioBlob) return;
  const formData = new FormData();
  formData.append('file', studioAudioBlob, 'kivi_speech.webm');
  formData.append('tone', currentStudioTone);

  try {
    const res = await fetch('/api/kivi/voice-dictate', { method: 'POST', body: formData });
    const data = await res.json();
    renderKiviStudioOutput(data);
  } catch (e) {
    console.error(e);
  }
}

async function runKiviStudio() {
  const text = document.getElementById('studio-speech-input').value.trim();
  if (!text) return;

  try {
    const res = await fetch('/api/kivi/format', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speech_text: text, tone: currentStudioTone })
    });
    const data = await res.json();
    renderKiviStudioOutput(data);
  } catch (e) {
    console.error(e);
  }
}

function renderKiviStudioOutput(data) {
  const box = document.getElementById('studio-results-box');
  box.style.display = 'block';
  box.innerHTML = `
    <div style="font-size: 12px; color: var(--accent-cyan); font-weight: 700; text-transform: uppercase;">
      Kivi Polish Complete (Tone: ${currentStudioTone.replace('_', ' ')})
    </div>
    
    <div style="margin-top: 10px; font-size: 15px; font-weight: 600; color: #fff; background: rgba(255,255,255,0.04); padding: 14px; border-radius: 8px;">
      "${data.formatted_message}"
    </div>

    <div style="margin-top: 10px; display: flex; gap: 10px; align-items: center;">
      <button class="tab-btn" style="background: var(--accent-saffron); color: #fff; font-size: 12px;" onclick="playBase64Audio('${data.audio_base64}')">
        🔊 Hear Voice Preview (Bulbul TTS)
      </button>
      <button class="tab-btn" style="background: rgba(255,255,255,0.08); font-size: 12px;" onclick="sendStudioMessageToChat('${data.formatted_message.replace(/'/g, "\\'")}', '${data.audio_base64}')">
        💬 Send to Active Match Chat
      </button>
    </div>
  `;
}

function sendStudioMessageToChat(formattedMsg, audioB64) {
  const container = document.getElementById('chat-messages-container');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg me';
  msgDiv.innerHTML = `
    <div>"${formattedMsg}"</div>
    <div class="translation-subtext">
      <span>Tone: ${currentStudioTone.replace('_', ' ')} • Slang Preserved</span>
      <button onclick="playBase64Audio('${audioB64}')" style="background:none; border:none; color:#ffd32a; cursor:pointer;">🔊</button>
    </div>
  `;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
  showToast('Sent to match chat!');
  switchTab('icebreaker');
}

// Chat Input Kivi Send
async function sendKiviMessage() {
  const input = document.getElementById('kivi-input');
  const text = input.value.trim();
  if (!text) return;

  try {
    const res = await fetch('/api/kivi/format', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speech_text: text, tone: state.kiviTone })
    });
    const data = await res.json();

    const container = document.getElementById('chat-messages-container');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg me';
    msgDiv.innerHTML = `
      <div>"${data.formatted_message}"</div>
      <div class="translation-subtext">
        <span>Tone: ${state.kiviTone.replace('_', ' ')} • Slang Preserved</span>
        <button onclick="playBase64Audio('${data.audio_base64}')" style="background:none; border:none; color:#ffd32a; cursor:pointer;">🔊</button>
      </div>
    `;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    input.value = '';
    showToast('✨ Formatted by Kivi & sent!');
  } catch (e) {
    console.error(e);
  }
}

// ==========================================
// 🪪 REAL SARVAM DOCUMENT AI OCR PORTAL
// ==========================================
let selectedIdFile = null;

function handleIdFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  selectedIdFile = file;
  document.getElementById('id-drop-title').innerText = `Selected: ${file.name}`;
  document.getElementById('id-drop-subtitle').innerText = `${Math.round(file.size / 1024)} KB • Click to change`;
  showToast(`File ${file.name} ready for Sarvam Doc AI OCR.`);
}

async function testSampleIdCard() {
  showToast('Fetching sample IIIT-H ID card image for Doc AI OCR...');
  try {
    const response = await fetch('/static/sample_id_card.png');
    const blob = await response.blob();
    selectedIdFile = new File([blob], 'sample_id_card.png', { type: 'image/png' });
    document.getElementById('id-drop-title').innerText = 'Selected: sample_id_card.png (Sample IIIT-H ID)';
    document.getElementById('id-drop-subtitle').innerText = 'Ready for Sarvam Document AI Digitisation';
    await submitVerification();
  } catch (e) {
    console.error(e);
  }
}

async function submitVerification() {
  const btn = document.getElementById('btn-submit-verify');
  btn.disabled = true;
  btn.innerText = '⏳ Running Sarvam Document AI OCR...';

  const resultBox = document.getElementById('verification-result-box');
  resultBox.style.display = 'block';
  resultBox.innerHTML = 'Submitting image to Sarvam Document AI digitise job...';

  try {
    let resData;
    if (selectedIdFile) {
      const formData = new FormData();
      formData.append('file', selectedIdFile);
      const res = await fetch('/api/verify-id-card', { method: 'POST', body: formData });
      resData = await res.json();
    } else {
      const email = document.getElementById('verify-email').value;
      const name = document.getElementById('verify-name').value;
      const branch = document.getElementById('verify-branch').value;
      const res = await fetch('/api/verify-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, student_name: name, branch })
      });
      resData = await res.json();
    }

    if (resData.success && resData.structured_data) {
      const sd = resData.structured_data;
      resultBox.innerHTML = `
        <div style="font-weight: 800; font-size: 15px; color: #2ed573;">🛡️ Verified IIIT-H Scholar (Sarvam Doc AI)</div>
        <div style="margin-top: 6px;">Student Name: <strong>${sd.student_name}</strong></div>
        <div>Roll Number: <strong>${sd.roll_number}</strong> | Branch: <strong>${sd.branch}</strong></div>
        <div>Campus Email: <strong>${sd.email}</strong></div>
        <div>Document AI Confidence: <strong>${sd.confidence_score}%</strong></div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">OCR Job ID: ${resData.job_id || 'N/A'}</div>
      `;
      showToast('🛡️ Student ID successfully verified via Sarvam Doc AI OCR!');
    } else if (resData.verified) {
      resultBox.innerHTML = `
        <div style="font-weight: 800; color: #2ed573;">${resData.verification_badge}</div>
        <div>Assigned Pseudonym: <strong>${resData.blind_pseudonym}</strong></div>
      `;
      showToast('🛡️ Student email verified!');
    } else {
      resultBox.innerHTML = `<span style="color: #ff4757;">Verification failed.</span>`;
    }

  } catch (err) {
    console.error(err);
    resultBox.innerHTML = `<span style="color: #ff4757;">OCR extraction failed.</span>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🛡️ Run Sarvam Document AI OCR & Verify';
  }
}

// ==========================================
// ⚡ 90S STAGE DEMO RUNNER
// ==========================================
async function triggerStageDemo() {
  const btn = document.getElementById('btn-run-stage-demo');
  btn.disabled = true;
  btn.innerText = '⏳ Executing Live Flow...';

  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById(`step-${i}`);
    if (el) el.classList.remove('active');
    const pl = document.getElementById(`step-${i}-payload`);
    if (pl) pl.style.display = 'none';
  }

  try {
    const res = await fetch('/api/demo/stage-scenario', { method: 'POST' });
    const data = await res.json();

    activateStep(1, `Speaker: ${data.step_1_speaker_a.name}\nTranscript: "${data.step_1_speaker_a.transcript}"\nBadge: ${data.step_1_speaker_a.badge}`);
    await playAudioFile(data.step_1_speaker_a.audio_file, 4000);

    activateStep(2, `Speaker: ${data.step_2_speaker_b.name}\nTranscript: "${data.step_2_speaker_b.transcript}"\nBadge: ${data.step_2_speaker_b.badge}`);
    await playAudioFile(data.step_2_speaker_b.audio_file, 4000);

    const lm = data.step_3_language_match;
    activateStep(3, `Calculated Synergy: ${lm.synergy_percentage}%\nBadge: ${lm.synergy_badge}\nType: ${lm.synergy_type}\nSarvam-105B Reasoning: "${lm.sarvam_ai_reasoning}"`);
    await sleep(2500);

    const ib = data.step_4_ai_icebreaker;
    activateStep(4, `Topic: "${ib.icebreaker.topic}"\nChallenge A: "${ib.icebreaker.question_for_a}"\nChallenge B: "${ib.icebreaker.question_for_b}"\nHost Voice: Bulbul TTS (kavya, en-IN)`);
    if (ib.host_audio_base64) await playBase64Audio(ib.host_audio_base64);

    const tr = data.step_5_live_translation;
    activateStep(5, `Original (Hindi): "${tr.original_hindi}"\nTranslated (Telugu): "${tr.translated_telugu}"\nVoice: Bulbul TTS (kavitha, te-IN)`);
    if (tr.telugu_audio_base64) await playBase64Audio(tr.telugu_audio_base64);

    const kv = data.step_6_kivi_power;
    activateStep(6, `Raw Dictated Speech: "${kv.original_speech}"\nTone: ${kv.tone}\nKivi Formatted: "${kv.formatted_message}"\nPreserved Campus Slang: Tantra, chill, scene.`);
    showToast('✨ 90s Stage Demo Completed Successfully!');

  } catch (err) {
    console.error(err);
    showToast('Demo runner encountered an issue.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>▶️</span> Run Live 90s Demo';
  }
}

function activateStep(stepNum, payloadText) {
  const step = document.getElementById(`step-${stepNum}`);
  if (step) {
    step.classList.add('active');
    step.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  const payloadBox = document.getElementById(`step-${stepNum}-payload`);
  if (payloadBox) {
    payloadBox.innerText = payloadText;
    payloadBox.style.display = 'block';
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function playAudioFile(src, maxDurationMs = null) {
  return new Promise(resolve => {
    audioPlayer.src = src;
    audioPlayer.play().then(() => {
      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };
      audioPlayer.onended = done;
      if (maxDurationMs) setTimeout(done, maxDurationMs);
    }).catch(resolve);
  });
}

function playBase64Audio(b64) {
  return new Promise(resolve => {
    audioPlayer.src = 'data:audio/wav;base64,' + b64;
    audioPlayer.play().then(() => {
      audioPlayer.onended = resolve;
    }).catch(resolve);
  });
}

function playSampleTTS(text) {
  fetch('/api/icebreaker/translate-speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: text,
      source_lang: 'en-IN',
      target_lang: 'en-IN',
      target_speaker: 'kavya'
    })
  }).then(r => r.json()).then(d => {
    if (d.audio_base64) playBase64Audio(d.audio_base64);
  }).catch(console.error);
}
