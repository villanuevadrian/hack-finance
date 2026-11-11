"""Text-to-speech with ElevenLabs, from the backend, for accessibility (RF-11).

The API key never reaches the browser: the frontend sends the text to POST /tts and gets the audio.
Each text is synthesised once and cached on disk (TTS_CACHE_DIR, default data/cache/tts, no git),
so replaying a result costs nothing. Without ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID it raises
TTSUnavailableError and the frontend falls back to the browser's voice.
"""

import hashlib
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

MAX_CHARS = 1500
DEFAULT_MODEL = "eleven_multilingual_v2"
# Vega voice: the SAME settings as frontend/scripts/gen-voice.mjs, so the pre-recorded lines and
# the dynamic ones (results, chat answers) sound like the same person. Change both together.
VOICE_SETTINGS = {
    "stability": 0.5,
    "similarity_boost": 0.8,
    "style": 0.2,
    "use_speaker_boost": True,
}


def voice_id() -> str | None:
    return os.environ.get("ELEVENLABS_VOICE_ID")


def model_id() -> str:
    return os.environ.get("ELEVENLABS_MODEL", DEFAULT_MODEL)


DEFAULT_CACHE = Path(__file__).resolve().parents[3] / "data" / "cache" / "tts"


class TTSUnavailableError(Exception):
    """No key configured, or the provider failed."""


def available() -> bool:
    return bool(os.environ.get("ELEVENLABS_API_KEY") and os.environ.get("ELEVENLABS_VOICE_ID"))


def _cache_dir() -> Path:
    path = Path(os.environ.get("TTS_CACHE_DIR", DEFAULT_CACHE))
    path.mkdir(parents=True, exist_ok=True)
    return path


def cache_path(text: str, voice: str | None, model: str) -> Path:
    """Where the audio of `text` is cached. The voice settings are part of the key, so changing
    Vega's voice never serves audio made with the old one."""
    settings = json.dumps(VOICE_SETTINGS, sort_keys=True)
    digest = hashlib.sha256(f"{voice}|{model}|{settings}|{text}".encode()).hexdigest()[:32]
    return _cache_dir() / f"{digest}.mp3"


def synthesize(text: str) -> bytes:
    """MP3 bytes for `text` (cached). Raises TTSUnavailableError if it cannot be produced."""
    text = " ".join(text.split())[:MAX_CHARS]
    if not text:
        raise TTSUnavailableError("texto vacío")
    key = os.environ.get("ELEVENLABS_API_KEY")
    voice = voice_id()
    model = model_id()
    cached = cache_path(text, voice, model)
    if cached.exists():
        return cached.read_bytes()
    if not key or not voice:
        raise TTSUnavailableError("sin clave de ElevenLabs")
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
        data=json.dumps(
            {"text": text, "model_id": model, "voice_settings": VOICE_SETTINGS}
        ).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            audio = resp.read()
    except (urllib.error.URLError, TimeoutError) as exc:
        raise TTSUnavailableError(str(exc)) from exc
    cached.write_bytes(audio)
    return audio
