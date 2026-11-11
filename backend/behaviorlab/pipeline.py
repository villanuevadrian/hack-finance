"""Finished game -> Posterior + Profile + PortfolioProposal. Pure orchestration of the core.

Every number comes from deterministic code; the justification is a fixed template
filled with those numbers (no LLM, principle 1).
"""

from behaviorlab.game.onboarding import (
    capacity_level,
    horizon_level,
    horizon_years,
    knowledge_level,
    starting_capital,
    stated_level,
)
from behaviorlab.inference import estimate_posterior
from behaviorlab.portfolio import (
    DEFAULT_MAX_PANIC_PROB,
    DEFAULT_N_PATHS,
    evaluate_candidates,
    revealed_level,
    select_portfolio,
    suitability_levels,
)
from contracts import (
    CandidateMetrics,
    Catalog,
    GameState,
    OnboardingAnswers,
    PortfolioProposal,
    Posterior,
    Profile,
    Reliability,
    SuitabilityLevels,
)

# TODO(Amanda): provisional reliability thresholds on the width of the 90 % interval of
# theta, until D7 sets the validation thresholds.
RELIABILITY_HIGH_WIDTH = 0.10
RELIABILITY_MEDIUM_WIDTH = 0.20

LEVEL_NAMES = {
    "revealed": "lo que muestra tu conducta en la partida",
    "capacity": "tu capacidad para asumir pérdidas",
    "horizon": "el plazo para el que inviertes",
}


def reliability(posterior: Posterior) -> Reliability:
    """alta if the theta 90 % interval is <= 0.10 wide, media if <= 0.20, else baja."""
    theta = next(p for p in posterior.summary if p.name == "theta")
    width = theta.ci_high - theta.ci_low
    if width <= RELIABILITY_HIGH_WIDTH:
        return Reliability.HIGH
    if width <= RELIABILITY_MEDIUM_WIDTH:
        return Reliability.MEDIUM
    return Reliability.LOW


def _pct(x: float) -> str:
    return f"{100 * x:.0f} %".replace(".", ",")


def justification(
    chosen: CandidateMetrics, levels: SuitabilityLevels, max_panic_prob: float, years: int
) -> str:
    """Fixed template filled with computed numbers."""
    names = [LEVEL_NAMES[k] for k in levels.limiting]
    limit = names[0] if len(names) == 1 else ", ".join(names[:-1]) + " y " + names[-1]
    return (
        f"Proponemos {chosen.name} (riesgo {chosen.risk_level} de 5): la cartera de más riesgo "
        f"que, según tu conducta, serías capaz de mantener dentro de tu nivel. El nivel máximo es "
        f"{levels.final}, limitado por {limit}. Simulando tu forma de reaccionar en "
        f"{years} años, la probabilidad de vender en pánico con esta cartera es "
        f"{_pct(chosen.p_panic)} (umbral: {_pct(max_panic_prob)}) y, en el 10 % de los peores "
        f"escenarios, cada euro invertido se convierte en {_eur(chosen.final_multiple_p10)}."
    )


def _eur(x: float) -> str:
    return f"{x:.2f} €".replace(".", ",")


def evaluate_game(
    state: GameState,
    answers: OnboardingAnswers,
    catalog: Catalog,
    max_panic_prob: float = DEFAULT_MAX_PANIC_PROB,
    n_paths: int = DEFAULT_N_PATHS,
) -> tuple[Posterior, Profile, PortfolioProposal]:
    """Profile and proposal of a finished game. Seeded with the game seed (reproducible)."""
    if not state.finished:
        raise ValueError("game not finished")
    posterior = estimate_posterior(state.history)
    capacity, horizon = capacity_level(answers), horizon_level(answers)
    years = horizon_years(answers)
    candidates = evaluate_candidates(
        posterior, catalog, years, min(capacity, horizon), state.seed, n_paths
    )
    levels = suitability_levels(revealed_level(candidates, max_panic_prob), capacity, horizon)
    chosen = select_portfolio(candidates, levels.final, max_panic_prob)

    profile = Profile(
        game_id=state.game_id,
        parameters=posterior.summary,
        n_rounds=len(state.history),
        reliability=reliability(posterior),
        knowledge_level=knowledge_level(answers),
        levels=levels,
        stated_reaction=answers.stated_reaction.value,
        stated_level=stated_level(answers),
        timeouts=sum(1 for d in state.history if d.timed_out),
        provisional_model=posterior.provisional,
    )
    proposal = PortfolioProposal(
        game_id=state.game_id,
        portfolio_id=chosen.portfolio_id,
        portfolio_name=chosen.name,
        risk_level=chosen.risk_level,
        levels=levels,
        candidates=candidates,
        max_panic_prob=max_panic_prob,
        horizon_years=years,
        n_paths=n_paths,
        seed=state.seed,
        amount_eur=starting_capital(answers),
        justification=justification(chosen, levels, max_panic_prob, years),
    )
    return posterior, profile, proposal
