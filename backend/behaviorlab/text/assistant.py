"""Vega's help desk: answers questions about HOW the game works, never about what to decide.

Two sources, in order:
1. Claude, when ANTHROPIC_API_KEY is set (model from ASSISTANT_MODEL), with strict guardrails.
2. A fixed FAQ (no network): the demo still answers the common questions offline (RNF-04).

Guardrails (CLAUDE.md principles 1 and 4, CALIBRACION.md §8): no investment advice or
recommendations, no predictions, no figures, no comments on the player's decisions, and the helper
is not available during the rounds of the game (the frontend hides it there). Only the question and
the screen name are sent: no answers of the questionnaire and no personal data.
"""

import json
import os
import unicodedata
import urllib.request
from dataclasses import dataclass

API_URL = "https://api.anthropic.com/v1/messages"
DEFAULT_MODEL = "claude-haiku-5-5"
MAX_QUESTION_CHARS = 500

SYSTEM = (
    "Eres Vega, la ayudante de un juego que sirve como evaluación de idoneidad para invertir."
    " Respondes en "
    "español, en tono cercano y en un máximo de 70 palabras. Solo explicas cómo funciona el "
    "juego, qué "
    "significan sus pantallas y conceptos financieros generales (fondo indexado, riesgo, "
    "diversificación, "
    "caída desde el máximo, comisiones). Nunca recomiendas productos ni qué decidir, nunca "
    "haces previsiones "
    "de mercado, nunca das cifras concretas y nunca valoras las decisiones de la persona. Si "
    "te piden un "
    "consejo de inversión, explica con amabilidad que no puedes darlo y que la propuesta "
    "final la hace la "
    "entidad con su evaluación. Si no sabes algo, dilo."
)


@dataclass(frozen=True)
class Answer:
    text: str
    source: str  # "claude" or "faq"


FAQ: list[tuple[tuple[str, ...], str]] = [
    (
        ("recomienda", "invierto", "comprar", "que hago", "deberia", "consejo", "mejor cartera"),
        "No puedo decirte qué hacer: este juego sirve para conocer cómo decides tú. Al final,"
        " la entidad te "
        "propondrá una cartera según tu evaluación, y puedes pedir que una persona la revise.",
    ),
    (
        ("que es este juego", "para que sirve", "de que va", "que es esto"),
        "Es tu evaluación de idoneidad en forma de juego: primero cuentas tu situación y tus "
        "objetivos, luego "
        "vives quince meses de mercado con dinero simulado y al final recibes tu perfil y una"
        " propuesta.",
    ),
    (
        ("idoneidad",),
        "La evaluación de idoneidad es lo que la normativa exige antes de ofrecerte una "
        "cartera: comprobar que "
        "encaja con tus conocimientos, tu situación y tus objetivos.",
    ),
    (
        (
            "ingresos",
            "sueldo",
            "patrimonio",
            "por que me preguntan",
            "datos personales",
            "mis datos",
        ),
        "Tu situación financiera ayuda a saber cuánto riesgo puedes asumir sin que te afecte."
        " No pedimos tu "
        "nombre ni datos identificativos, y puedes elegir «Prefiero no responder».",
    ),
    (
        ("no respondo", "prefiero no", "no se"),
        "Puedes no responder o decir «No lo sé». Si faltan datos esenciales de tu situación, "
        "la entidad no "
        "podrá prepararte una propuesta, porque la normativa no lo permite sin información "
        "suficiente.",
    ),
    (
        ("vender", "mantener", "aportar", "botones", "opciones"),
        "Cada mes eliges una opción: vender todo, mantener o aportar más. Ninguna es la "
        "correcta: decide como "
        "lo harías con tu propio dinero.",
    ),
    (
        ("maximo", "por debajo"),
        "«Por debajo de tu máximo» es cuánto ha bajado tu dinero desde el punto más alto que "
        "ha tenido en la "
        "partida.",
    ),
    (
        ("indexad", "fondo"),
        "Un fondo indexado reparte tu dinero entre muchas empresas copiando un índice. "
        "Diversifica, pero sigue "
        "subiendo y bajando con el mercado.",
    ),
    (
        ("riesgo", "nivel"),
        "El nivel de riesgo indica cuánto puede moverse una cartera: más riesgo suele "
        "significar subidas y "
        "bajadas más grandes.",
    ),
    (
        ("segundos", "tiempo", "reloj", "rapido"),
        "Cada mes tienes un tiempo limitado para decidir, como cuando el mercado se mueve de "
        "verdad. Si no "
        "eliges a tiempo, cuenta como no hacer nada.",
    ),
    (
        ("revelacion", "otras decisiones", "que habria pasado"),
        "Al final verás tu camino junto al mismo mercado jugado con otras decisiones. Es "
        "información sobre ese "
        "mercado concreto, no una recomendación.",
    ),
]
FALLBACK = (
    "Puedo ayudarte con cómo funciona el juego, sus pantallas y conceptos como riesgo o "
    "diversificación. "
    "Lo que no puedo es decirte qué decidir."
)


def _norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in text if not unicodedata.combining(c))


def faq_answer(question: str) -> str:
    q = _norm(question)
    for keys, answer in FAQ:
        if any(k in q for k in keys):
            return answer
    return FALLBACK


def _ask_claude(question: str, screen: str, key: str) -> str:
    body = {
        "model": os.environ.get("ASSISTANT_MODEL", DEFAULT_MODEL),
        "max_tokens": 300,
        "system": SYSTEM,
        "messages": [{"role": "user", "content": f"[Pantalla: {screen}] {question}"}],
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
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.load(resp)
    return "".join(
        b.get("text", "") for b in data.get("content", []) if b.get("type") == "text"
    ).strip()


def answer(question: str, screen: str = "") -> Answer:
    """Answer a help question. Falls back to the FAQ if there is no key or the call fails."""
    question = question.strip()[:MAX_QUESTION_CHARS]
    key = os.environ.get("ANTHROPIC_API_KEY")
    if key:
        try:
            text = _ask_claude(question, screen[:40], key)
            if text:
                return Answer(text, "claude")
        except Exception:  # noqa: BLE001 - any network or API error: the FAQ still answers
            pass
    return Answer(faq_answer(question), "faq")
