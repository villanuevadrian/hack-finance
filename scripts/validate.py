"""Run the (backup) validation battery and write reports/validation.md. Seeded: same report."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

from behaviorlab.validation.battery import (  # noqa: E402
    STATED_BIAS,
    STATED_NOISE,
    v1_recovery,
    v1b_rule_players,
    v2_prediction,
    v4_invariants,
)
from contracts import Catalog, OnboardingAnswers  # noqa: E402

N_V1 = 300
N_V2 = 300
N_RULE_SEEDS = 20

# Player with capacity 5 and horizon 5: plays Cartera Metal, the portfolio that falls the most
ANSWERS = {
    "consent": True,
    "education": "university",
    "occupation": "employee",
    "known_products": ["index_funds_etf"],
    "invested_products": [],
    "trading_frequency": "never",
    "invested_volume": "none",
    "quiz_risk": "single_stock",
    "quiz_recovery": "p50",
    "quiz_guarantee": "false",
    "income": "1800_2500",
    "income_source": "permanent",
    "monthly_saving": "100_300",
    "financial_wealth": "5k_20k",
    "fixed_commitments": "lt_20",
    "emergency_months": "gt_6",
    "share_invested": "lt_25",
    "amount_eur": 5000,
    "goal": "long_term_growth",
    "horizon": "gt_7",
    "return_preference": "minus15_plus6",
    "stated_reaction": "wait",
}


def pct(x: float) -> str:
    return f"{100 * x:.0f} %"


def main() -> int:
    catalog = Catalog.model_validate(
        json.loads((ROOT / "data/catalog/myinvestor_carteras_2026-11-08.json").read_text())
    )
    answers = OnboardingAnswers.model_validate(ANSWERS)
    v1 = v1_recovery(answers, catalog, N_V1)
    v1b = v1b_rule_players(answers, catalog, n_seeds=N_RULE_SEEDS)
    v2 = v2_prediction(answers, catalog, N_V2)
    v4 = v4_invariants(answers, catalog)

    names = {
        "lambda": "λ aversión a la pérdida",
        "theta": "θ caída a la que vende",
        "eta": "η parte de la subida que invierte",
    }
    lines = [
        "# Informe de validación",
        "",
        "Generado por `make validate` (`scripts/validate.py`). Todo con semilla: el mismo código da el mismo informe.",
        "Estimación con el **modelo robusto de Datos** (`inference/model.py`, el que usa la API). "
        "Jugadores **simulados** sobre el motor real (no hay usuarios reales todavía). "
        "La validación V1 completa de Datos, con varios tipos de jugador, está en `reports/v1_model_k15.txt`.",
        "",
        f"## V1 · Recuperación de parámetros ({N_V1} jugadores simulados)",
        "Parámetros verdaderos al azar en el rango de la rejilla; cada acción se elige con el modelo de elección. "
        "Un intervalo creíble del 90 % bien calibrado debe contener el valor verdadero en torno al 90 % de las veces.",
        "",
        "| Parámetro | Error medio absoluto | Cobertura del IC 90 % | Anchura media del IC |",
        "|---|---|---|---|",
        *[
            f"| {names[r.name]} | {r.mae:.3f} | {pct(r.coverage)} | {r.mean_width:.3f} |"
            for r in v1
        ],
        "",
        "Lectura: θ y η se recuperan con precisión útil. **λ apenas se identifica** con 15 rondas: su intervalo "
        "cubre casi todo el rango, así que el panel lo muestra con su incertidumbre y la recomendación no lo usa.",
        "",
        f"## V1b · Robustez: jugadores con una regla fija ({N_RULE_SEEDS} mercados por regla)",
        "No los genera el modelo: venden todo cuando la caída llega a un umbral y, si no, mantienen.",
        "",
        "| Umbral real de venta | Vendieron | θ estimado medio |",
        "|---|---|---|",
        *[f"| {pct(r.threshold)} | {r.n_sold}/{r.n} | {r.theta_mean:.2f} |" for r in v1b],
        "",
        "Si el mercado no llega al umbral, el jugador no vende y solo sabemos que aguanta más de lo que vio: "
        "θ queda censurado y la fiabilidad del perfil baja.",
        "",
        f"## V2 · Predicción frente a un cuestionario ({N_V2} jugadores simulados)",
        "Con las rondas 1-10 se predicen las decisiones de las rondas 11-15. El cuestionario responde O4 "
        f"(«si cayera un 20 %…») con un umbral declarado = verdadero + {STATED_BIAS} + ruido N(0, {STATED_NOISE}²) "
        "(supuesto de exceso de confianza, **no medido**).",
        "",
        "| Método | Log-probabilidad predictiva media (más alto, mejor) | Acierto |",
        "|---|---|---|",
        *[f"| {r.method} | {r.lpd:.3f} | {pct(r.accuracy)} |" for r in v2],
        "",
        "## V4 · Invariantes numéricos",
        f"- Máxima desviación de la suma de pesos del posterior respecto a 1: {v4['max_desviacion_suma_pesos']:.1e}.",
        f"- Error estándar máximo de P(pánico) con {int(v4['n_trayectorias'])} trayectorias: "
        f"{100 * v4['error_estandar_max_p_panico']:.1f} pp.",
        "- Conservación del capital con rentabilidad cero, reglas de idoneidad y reproducibilidad: tests "
        "automáticos (`make test`).",
        "",
        "## Límites",
        "- Jugadores simulados con el mismo modelo que estima (V1) o con reglas simples (V1b); faltan usuarios reales.",
        "- El sesgo del cuestionario en V2 es un supuesto; con usuarios reales se mediría.",
        "- Umbrales de éxito (D7) sin cerrar: se proponen cobertura entre 85 % y 95 % y que el juego supere al cuestionario en V2.",
        "",
    ]
    out = ROOT / "reports" / "validation.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"Escrito {out.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
