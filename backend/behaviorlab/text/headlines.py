"""Market headlines for the game (RF-09): TextGenerator with Claude and a deterministic fallback.

Headlines are generated ONCE, offline, and cached in data/cache/headlines.json, so the demo never
waits for a live call and works without network (RNF-04). Without the cache, the templates are used.

Rules (CLAUDE.md, CALIBRACION.md §8): no figures, no dates, no names of companies, people or
historical episodes; one bucket per size of the market move, so the same move gets the same tone.

Generate the cache (needs ANTHROPIC_API_KEY):
    .venv/bin/python -m behaviorlab.text.headlines
"""

import json
import os
import re
import urllib.request
from pathlib import Path

BUCKETS = ("strong_drop", "drop", "flat", "rise", "strong_rise")
CACHE = Path(__file__).resolve().parents[3] / "data" / "cache" / "headlines.json"
API_URL = "https://api.anthropic.com/v1/messages"
DEFAULT_MODEL = "claude-haiku-5-5"
PER_BUCKET = 6

TEMPLATES: dict[str, list[str]] = {
    "strong_drop": [
        "Fuertes caídas en las bolsas de todo el mundo",
        "Los inversores venden: el pesimismo se extiende",
        "Jornadas de pánico en los mercados",
    ],
    "drop": [
        "Los mercados cierran el mes en rojo",
        "Crece la preocupación por la economía",
        "Los analistas recortan sus previsiones",
    ],
    "flat": [
        "Mes tranquilo en los mercados, sin una dirección clara",
        "Las bolsas se mueven poco a la espera de noticias",
        "Calma tensa en los mercados",
    ],
    "rise": [
        "Los mercados recuperan terreno",
        "Mejoran los datos de empleo y consumo",
        "Las bolsas cierran el mes en verde",
    ],
    "strong_rise": [
        "Fuertes subidas en las bolsas",
        "Vuelve el optimismo a los mercados",
        "Los inversores regresan a la bolsa",
    ],
}

TONE = {
    "strong_drop": "una caída fuerte de las bolsas mundiales",
    "drop": "una caída moderada de las bolsas",
    "flat": "un mes casi plano, sin dirección clara",
    "rise": "una subida moderada de las bolsas",
    "strong_rise": "una subida fuerte de las bolsas mundiales",
}

FORBIDDEN = re.compile(r"[0-9%€$]")


def valid(headline: str) -> bool:
    """No figures or symbols, short, one line."""
    h = headline.strip()
    return 15 <= len(h) <= 80 and not FORBIDDEN.search(h) and "\n" not in h


def _ask_claude(bucket: str, key: str) -> list[str]:
    prompt = (
        f"Escribe {PER_BUCKET} titulares de prensa económica en español de España sobre "
        f"{TONE[bucket]}. Reglas: sin cifras ni porcentajes, sin fechas, sin nombres de empresas, "
        "personas, países ni crisis históricas, máximo 70 caracteres, tono periodístico realista. "
        "Devuelve solo los titulares, uno por línea, sin numeración ni comillas."
    )
    body = {
        "model": os.environ.get("HEADLINES_MODEL", DEFAULT_MODEL),
        "max_tokens": 400,
        "messages": [{"role": "user", "content": prompt}],
    }
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(body).encode(),
        headers={
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)
    blocks = data.get("content", [])
    text = "".join(b.get("text", "") for b in blocks if b.get("type") == "text")
    lines = [ln.strip().strip("-•*\"'«»").strip() for ln in text.splitlines()]
    return [ln for ln in lines if valid(ln)][:PER_BUCKET]


def build_cache(path: Path = CACHE) -> dict[str, list[str]]:
    """Generate the headlines with Claude and write the cache; failed buckets keep the templates."""
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        raise SystemExit("Falta ANTHROPIC_API_KEY.")
    bank = {b: (_ask_claude(b, key) or TEMPLATES[b]) for b in BUCKETS}
    payload = {"source": "claude", "headlines": bank}
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return bank


def load_bank(path: Path = CACHE) -> tuple[str, dict[str, list[str]]]:
    """The cached bank if it exists and is valid; otherwise the templates."""
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        bank = {b: [h for h in raw["headlines"].get(b, []) if valid(h)] for b in BUCKETS}
        if all(bank.values()):
            return raw.get("source", "claude"), bank
    except (OSError, ValueError, KeyError, AttributeError):
        pass
    return "templates", TEMPLATES


if __name__ == "__main__":
    result = build_cache()
    for bucket, items in result.items():
        print(bucket, "->", len(items), "titulares")
    print(f"Guardado en {CACHE}")
