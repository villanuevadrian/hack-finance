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
MAX_HISTORY = 10

SYSTEM = (
    "Eres Vega, la ayudante de un juego que sirve como evaluación de idoneidad para invertir. "
    "Respondes en español, en tono cercano y claro, en un máximo de 110 palabras. Puedes "
    "explicar cómo funciona el juego, conceptos financieros generales y, si se te dan, los "
    "RESULTADOS de esta persona: por qué recibió esa propuesta, qué limita su nivel y cuánta "
    "confianza hay en su perfil. Reglas estrictas: usa solo las cifras que aparecen en los "
    "resultados, nunca inventes otras; no recomiendes productos distintos de la propuesta de la "
    "entidad ni digas qué decidir; no hagas previsiones de mercado; no valores a la persona. Si "
    "te piden un consejo de inversión, explica con amabilidad que la propuesta la hace la entidad "
    "con su evaluación y que puede pedir revisión humana. Si el perfil es poco concluyente, "
    "explica que la propuesta es prudente por falta de información y qué la mejoraría. Si no "
    "sabes algo o no está en los resultados, dilo."
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


def _ask_claude(
    question: str, screen: str, key: str, history: list[dict[str, str]], context: str
) -> str:
    system = SYSTEM + (f"\n\nResultados de esta persona:\n{context}" if context else "")
    messages = [m for m in history[-MAX_HISTORY:] if m.get("role") in ("user", "assistant")]
    messages.append({"role": "user", "content": f"[Pantalla: {screen}] {question}"})
    body = {
        "model": os.environ.get("ASSISTANT_MODEL", DEFAULT_MODEL),
        "max_tokens": 400,
        "system": system,
        "messages": [
            {"role": m["role"], "content": m["content"][: MAX_QUESTION_CHARS * 2]} for m in messages
        ],
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
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.load(resp)
    blocks = data.get("content", [])
    return "".join(b.get("text", "") for b in blocks if b.get("type") == "text").strip()


RESULT_WORDS = ("por que", "cartera", "recomend", "propuesta", "perfil", "confianza", "resultado")


def answer(
    question: str,
    screen: str = "",
    history: list[dict[str, str]] | None = None,
    context: str = "",
) -> Answer:
    """Answer a help question, with the conversation so far and (optionally) the player's results.
    Falls back to the FAQ (or to the results themselves) if there is no key or the call fails."""
    question = question.strip()[:MAX_QUESTION_CHARS]
    key = os.environ.get("ANTHROPIC_API_KEY")
    if key:
        try:
            text = _ask_claude(question, screen[:40], key, history or [], context)
            if text:
                return Answer(text, "claude")
        except Exception:  # noqa: BLE001 - any network or API error: the fallback still answers
            pass
    q = _norm(question)
    if context and any(w in q for w in RESULT_WORDS) and not any(k in q for k in FAQ[0][0]):
        return Answer(f"Esto es lo que dicen tus resultados: {context_summary(context)}", "faq")
    return Answer(faq_answer(question), "faq")


def context_summary(context: str) -> str:
    """The plain-language lines of the context, for the offline fallback."""
    return " ".join(line.removeprefix("- ") for line in context.splitlines() if line.strip())


GOAL_TEXT = {
    "emergency_fund": "tener un colchón para imprevistos",
    "purchase": "comprar algo en unos años",
    "long_term_growth": "hacer crecer sus ahorros a largo plazo",
    "retirement": "su jubilación",
}
HORIZON_TEXT = {
    "lt_2": "menos de 2 años",
    "2_3": "de 2 a 3 años",
    "3_4": "de 3 a 4 años",
    "4_6": "de 4 a 6 años",
    "6_7": "de 6 a 7 años",
    "gt_7": "más de 7 años",
}


def build_context(profile, proposal, answers=None) -> str:  # noqa: ANN001 - contract models
    """Only what Vega needs to explain the result: the results, plus the goal and horizon the player
    chose (closed options that explain the recommendation). No other questionnaire answers, no free
    texts, nothing identifying."""
    levels = profile.levels
    names = {
        "revealed": "lo que mostró en la partida",
        "capacity": "su capacidad para asumir pérdidas",
        "horizon": "su horizonte",
    }
    limiting = " y ".join(names.get(x, x) for x in levels.limiting)
    theta = next((p for p in profile.parameters if p.name == "theta"), None)
    chosen = next((c for c in proposal.candidates if c.portfolio_id == proposal.portfolio_id), None)
    lines = [
        f"- Propuesta de la entidad: {proposal.portfolio_name}, nivel de riesgo "
        f"{proposal.risk_level} de 5.",
        f"- Niveles: revelado {levels.revealed}, capacidad {levels.capacity}, horizonte "
        f"{levels.horizon}; nivel final {levels.final}, limitado por {limiting}.",
        f"- Justificación: {proposal.justification}",
        f"- Confianza del perfil: {profile.reliability}; rondas sin responder a tiempo: "
        f"{profile.timeouts}.",
        f"- Nivel declarado (antes de jugar): {profile.stated_level}; nivel revelado: "
        f"{levels.revealed}.",
    ]
    if answers is not None:
        goal = getattr(answers.goal, "value", answers.goal)
        horizon = getattr(answers.horizon, "value", answers.horizon)
        lines.append(
            f"- Objetivo elegido: {GOAL_TEXT.get(goal, goal)}; horizonte: "
            f"{HORIZON_TEXT.get(horizon, horizon)}."
        )
    if theta:
        lines.append(
            f"- Caída de la cartera a la que vendería: entre el {theta.ci_low:.0%} y el "
            f"{theta.ci_high:.0%} (intervalo del 90 %)."
        )
    if chosen:
        lines.append(
            f"- Probabilidad estimada de venta en pánico con la propuesta: {chosen.p_panic:.0%} "
            f"(umbral {proposal.max_panic_prob:.0%})."
        )
    return "\n".join(lines)
