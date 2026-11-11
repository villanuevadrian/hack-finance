"""Robust choice model and grid posterior (Datos). Production model used by the API.

Same three behavioural parameters and the same action utilities as the reference model
(D1/D2), but the two quantities the reference model fixed by hand are now person-level
NUISANCE parameters that are marginalised, so the credible intervals reflect that real players
are noisier and less consistent than a fixed softmax assumes.

Notation. d = drawdown the player saw (0.2 = -20 %), f = raise share. Base noise scales
TAU, TAU_C, TAU_ETA; noise multiplier s; lapse probability eps.

  Utilities (noise scales multiplied by s):
    in the market:
      u(SELL_ALL)   = (d - theta) / (s TAU)
      u(HOLD)       = 0
      u(CONTRIBUTE) = (C0 - lam d) / (s TAU_C)
    out of the market:
      u(BUY_BACK)   = (theta - d) / (s TAU) - INERTIA
      u(STAY_OUT)   = 0
    raise round:
      u(INVEST_RAISE_f) = -(f - eta)^2 / (s TAU_ETA)

  Softmax with lapse over the n available actions:
      P(a | lam, theta, eta, s, eps) = (1 - eps) exp(u_a) / sum_b exp(u_b) + eps / n

  Likelihood of one player, for fixed nuisance (s, eps) shared by all their decisions
  (timed-out decisions are not real choices and are skipped):
      L(lam, theta, eta | s, eps) = prod_k P(a_k | ...)

  Marginal posterior over a uniform prior on the (lam, theta, eta) grid:
      w_ijk  proportional to  sum_{(s, eps)} pi(s) pi(eps) L(lam_i, theta_j, eta_k | s, eps)

Summary per parameter: marginal mean and 90 % credible interval [q05, q95] (linear
interpolation of the marginal CDF), widened if needed to contain the mean. A parameter whose
interval covers more than `UNINFORMATIVE_SHARE` of its grid range is labelled as weakly
informative in its description (principle 5: no value without its uncertainty).

The nuisance grids are a modelling choice. They are validated against generators that are NOT
inside the grid (see `validation/simulate.py`: `mixed`, `noisy3`, `hard`).
"""

import numpy as np

from contracts import Action, Decision, ParameterEstimate, Posterior

LAMBDA_GRID = np.linspace(1.0, 3.5, 26)
THETA_GRID = np.linspace(0.02, 0.50, 25)
ETA_GRID = np.linspace(0.0, 1.0, 21)

TAU = 0.03
TAU_C = 0.05
TAU_ETA = 0.10
C0 = 0.02
INERTIA = 1.0

# Person-level nuisance parameters (marginalised): noise multiplier and lapse probability.
NOISE_SCALES = np.array([0.5, 1.0, 2.0])
NOISE_PRIOR = np.array([0.25, 0.50, 0.25])
LAPSES = np.array([0.0, 0.10, 0.20])
LAPSE_PRIOR = np.array([0.50, 0.30, 0.20])

UNINFORMATIVE_SHARE = 0.80

RAISE_SHARE = {
    Action.INVEST_RAISE_0: 0.0,
    Action.INVEST_RAISE_50: 0.5,
    Action.INVEST_RAISE_100: 1.0,
}

DESCRIPTIONS = {
    "lambda": "Aversión a la pérdida (1 = neutral; más alto, menos compra en caídas)",
    "theta": "Caída de la cartera a partir de la cual vende (0,20 = −20 %)",
    "eta": "Parte de una subida de sueldo que invierte (0 a 1)",
}
UNINFORMATIVE_NOTE = " [poco informativo con las decisiones de esta partida]"

# Flipped to False only when V1 and V2 pass (see reports/validation.md).
PROVISIONAL = False


def _utilities(
    decision: Decision, lam: np.ndarray, theta: np.ndarray, eta: np.ndarray, scale: float
) -> dict[Action, np.ndarray]:
    """Utility of every available action, broadcast over the (lam, theta, eta) grid."""
    d = decision.portfolio_drawdown
    zeros = np.zeros(np.broadcast_shapes(lam.shape, theta.shape, eta.shape))
    u: dict[Action, np.ndarray] = {}
    for a in decision.available_actions:
        if a == Action.SELL_ALL:
            u[a] = zeros + (d - theta) / (scale * TAU)
        elif a in (Action.HOLD, Action.STAY_OUT):
            u[a] = zeros
        elif a == Action.CONTRIBUTE:
            u[a] = zeros + (C0 - lam * d) / (scale * TAU_C)
        elif a == Action.BUY_BACK:
            u[a] = zeros + (theta - d) / (scale * TAU) - INERTIA
        else:
            u[a] = zeros - (RAISE_SHARE[a] - eta) ** 2 / (scale * TAU_ETA)
    return u


def _log_lik_cell(
    decisions: list[Decision],
    lam: np.ndarray,
    theta: np.ndarray,
    eta: np.ndarray,
    scale: float,
    lapse: float,
) -> np.ndarray:
    """log L on the grid for one nuisance value (scale, lapse)."""
    total = np.zeros(np.broadcast_shapes(lam.shape, theta.shape, eta.shape))
    for dec in decisions:
        if dec.timed_out:
            continue
        u = _utilities(dec, lam, theta, eta, scale)
        stacked = np.stack(list(u.values()))
        m = stacked.max(axis=0)
        log_norm = m + np.log(np.exp(stacked - m).sum(axis=0))
        p = np.exp(u[dec.action] - log_norm)
        total += np.log((1 - lapse) * p + lapse / len(dec.available_actions))
    return total


def log_marginal_grid(decisions: list[Decision]) -> np.ndarray:
    """log of the nuisance-marginalised likelihood on the (lam, theta, eta) grid."""
    lam = LAMBDA_GRID[:, None, None]
    theta = THETA_GRID[None, :, None]
    eta = ETA_GRID[None, None, :]
    cells = []
    for s, ps in zip(NOISE_SCALES, NOISE_PRIOR, strict=True):
        for e, pe in zip(LAPSES, LAPSE_PRIOR, strict=True):
            cells.append(
                np.log(ps * pe) + _log_lik_cell(decisions, lam, theta, eta, float(s), float(e))
            )
    stacked = np.stack(cells)
    m = stacked.max(axis=0)
    return m + np.log(np.exp(stacked - m).sum(axis=0))


def action_probabilities(
    decision: Decision,
    lam: float,
    theta: float,
    eta: float,
    scale: float = 1.0,
    lapse: float = 0.0,
) -> dict[Action, float]:
    """P(a | params, nuisance) for one decision at a single point (scalar reference)."""
    u = _utilities(decision, np.array(lam), np.array(theta), np.array(eta), scale)
    vals = {a: float(v) for a, v in u.items()}
    m = max(vals.values())
    z = sum(np.exp(v - m) for v in vals.values())
    n = len(vals)
    return {a: float((1 - lapse) * np.exp(v - m) / z + lapse / n) for a, v in vals.items()}


def _summary(name: str, grid: np.ndarray, weights: np.ndarray) -> ParameterEstimate:
    mean = float(np.dot(grid, weights))
    cdf = np.cumsum(weights)
    low = min(float(np.interp(0.05, cdf, grid)), mean)
    high = max(float(np.interp(0.95, cdf, grid)), mean)
    note = ""
    if (high - low) / (grid[-1] - grid[0]) > UNINFORMATIVE_SHARE:
        note = UNINFORMATIVE_NOTE
    return ParameterEstimate(
        name=name, mean=mean, ci_low=low, ci_high=high, description=DESCRIPTIONS[name] + note
    )


def estimate_posterior(decisions: list[Decision]) -> Posterior:
    """Grid posterior over (lambda, theta, eta), marginalising noise and lapses."""
    log_l = log_marginal_grid(decisions)
    w = np.exp(log_l - log_l.max())
    w /= w.sum()
    marginals = {
        "lambda": w.sum(axis=(1, 2)),
        "theta": w.sum(axis=(0, 2)),
        "eta": w.sum(axis=(0, 1)),
    }
    marginals = {k: v / v.sum() for k, v in marginals.items()}
    grids = {"lambda": LAMBDA_GRID, "theta": THETA_GRID, "eta": ETA_GRID}
    return Posterior(
        grid={k: [float(x) for x in g] for k, g in grids.items()},
        marginals={k: [float(x) for x in v] for k, v in marginals.items()},
        summary=[_summary(k, grids[k], marginals[k]) for k in ("lambda", "theta", "eta")],
        n_decisions=sum(1 for d in decisions if not d.timed_out),
        provisional=PROVISIONAL,
    )
