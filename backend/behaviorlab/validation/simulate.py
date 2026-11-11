"""Simulated players for validation (V1, V2). Pure: no disk, no network, explicit seeds.

A simulated player has KNOWN true parameters (lam, theta, eta) and plays the REAL game engine
(`new_game` + `apply_decision`), so the decisions the estimators see have exactly the shape and
context of real games.

The generating models are defined HERE with their own copy of the constants, deliberately
independent of `inference/`: when the inference model changes, the generators must not move
(otherwise the validation would grade the model against itself).

Generators (all softmax over action utilities, utilities as in the docstring of
`inference/reference.py` unless stated; d = drawdown, f = raise share):
  matched : same formulas and constants as the reference model (well specified).
  noisy   : all noise scales x 2 (players less consistent than assumed).
  sharp   : all noise scales x 0.5 (players more consistent than assumed).
  lapse   : matched, but with probability 0.15 the player picks a uniformly random action
            (inattention); a mixture the model does not contain.
  hard    : sells exactly when d >= theta (no noise), 5 % lapses; a deterministic rule.
"""

from collections.abc import Callable
from dataclasses import dataclass

import numpy as np

from behaviorlab.game.engine import apply_decision, new_game
from contracts import Action, Catalog, GameState, OnboardingAnswers

TAU = 0.03
TAU_C = 0.05
TAU_ETA = 0.10
C0 = 0.02
INERTIA = 1.0
LAPSE_PROB = 0.15
HARD_LAPSE_PROB = 0.05

RAISE_SHARE = {
    Action.INVEST_RAISE_0: 0.0,
    Action.INVEST_RAISE_50: 0.5,
    Action.INVEST_RAISE_100: 1.0,
}

# Range of true parameters used to draw players: inside the inference grids, away from the
# edges (edge behaviour is checked separately with explicit scenarios).
LAMBDA_RANGE = (1.0, 3.5)
THETA_RANGE = (0.05, 0.45)
ETA_RANGE = (0.0, 1.0)


@dataclass(frozen=True)
class TrueParams:
    lam: float
    theta: float
    eta: float


def sample_params(rng: np.random.Generator) -> TrueParams:
    """Uniform draw of (lam, theta, eta) over the ranges above."""
    return TrueParams(
        lam=float(rng.uniform(*LAMBDA_RANGE)),
        theta=float(rng.uniform(*THETA_RANGE)),
        eta=float(rng.uniform(*ETA_RANGE)),
    )


def _utilities(state: GameState, p: TrueParams, scale: float) -> dict[Action, float]:
    """Utility of each available action; `scale` multiplies every noise scale."""
    d = state.portfolio_drawdown
    tau, tau_c, tau_eta = TAU * scale, TAU_C * scale, TAU_ETA * scale
    u: dict[Action, float] = {}
    for a in state.available_actions:
        if a == Action.SELL_ALL:
            u[a] = (d - p.theta) / tau
        elif a in (Action.HOLD, Action.STAY_OUT):
            u[a] = 0.0
        elif a == Action.CONTRIBUTE:
            u[a] = (C0 - p.lam * d) / tau_c
        elif a == Action.BUY_BACK:
            u[a] = (p.theta - d) / tau - INERTIA
        else:
            u[a] = -((RAISE_SHARE[a] - p.eta) ** 2) / tau_eta
    return u


def _softmax(u: dict[Action, float]) -> dict[Action, float]:
    m = max(u.values())
    z = {a: float(np.exp(v - m)) for a, v in u.items()}
    total = sum(z.values())
    return {a: v / total for a, v in z.items()}


def _with_lapse(probs: dict[Action, float], lapse: float) -> dict[Action, float]:
    n = len(probs)
    return {a: (1 - lapse) * v + lapse / n for a, v in probs.items()}


def _hard_probs(state: GameState, p: TrueParams) -> dict[Action, float]:
    """Deterministic rule with 5 % lapses: sell iff d >= theta, buy back iff d < theta."""
    d = state.portfolio_drawdown
    acts = state.available_actions
    if Action.SELL_ALL in acts:
        pick = Action.SELL_ALL if d >= p.theta else Action.HOLD
    elif Action.BUY_BACK in acts:
        pick = Action.BUY_BACK if d < p.theta else Action.STAY_OUT
    else:  # raise round: the closest option to eta
        pick = min(RAISE_SHARE, key=lambda a: abs(RAISE_SHARE[a] - p.eta))
    base = {a: 1.0 if a == pick else 0.0 for a in acts}
    return _with_lapse(base, HARD_LAPSE_PROB)


Generator = Callable[[GameState, TrueParams], dict[Action, float]]


def _softmax_generator(scale: float, lapse: float = 0.0) -> Generator:
    def probs(state: GameState, p: TrueParams) -> dict[Action, float]:
        out = _softmax(_utilities(state, p, scale))
        return _with_lapse(out, lapse) if lapse else out

    return probs


GENERATORS: dict[str, Generator] = {
    "matched": _softmax_generator(1.0),
    "noisy": _softmax_generator(2.0),
    "sharp": _softmax_generator(0.5),
    "lapse": _softmax_generator(1.0, LAPSE_PROB),
    "hard": _hard_probs,
    # Held out: values that are NOT in the nuisance grids of inference/model.py
    # (scales 0.5/1/2, lapses 0/0.1/0.2), so they test robustness, not memorisation.
    "mixed": _softmax_generator(1.5, 0.10),
    "noisy3": _softmax_generator(3.0),
}


def play_game(
    params: TrueParams,
    generator: Generator,
    seed: int,
    answers: OnboardingAnswers,
    catalog: Catalog,
    rng: np.random.Generator,
) -> GameState:
    """Play a full game: every action is drawn from the generator's probabilities."""
    scenario, state = new_game(f"sim-{seed}", answers, catalog, seed)
    while not state.finished:
        probs = generator(state, params)
        actions = list(probs)
        action = actions[int(rng.choice(len(actions), p=np.array(list(probs.values()))))]
        state = apply_decision(state, scenario, action, response_time_ms=1000)
    return state
