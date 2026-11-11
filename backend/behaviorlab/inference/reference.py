"""Reference choice model and grid posterior with FIXED decision noise (first version).

The API uses the robust model of `model.py` (Datos), which marginalises the noise and lapses.
This module is kept as the reference: it generates the simulated players of the validation
and is the baseline the robust model is compared with (reports/v1_reference_k15.txt).

Choice model: softmax over action utilities with fixed noise (D1: tau fixed in T0).
Let d be the portfolio drawdown the player saw (0.2 = -20 %), and f the raise share.

  Market round, invested:
    u(SELL_ALL)   = (d - theta) / TAU             sells once the drop exceeds theta
    u(HOLD)       = 0
    u(CONTRIBUTE) = (C0 - lam * d) / TAU_C        loss aversion damps buying in a drop
  Market round, out of the market:
    u(BUY_BACK)   = (theta - d) / TAU - INERTIA
    u(STAY_OUT)   = 0
  Raise round:
    u(INVEST_RAISE_f) = -(f - eta)^2 / TAU_ETA

  P(a) = exp(u(a)) / sum_b exp(u(b));  log L = sum over non-timed-out decisions log P(a_k)

Posterior on a uniform-prior grid: w_ijk ∝ exp(log L(lam_i, theta_j, eta_k)), sum w = 1.
Summary per parameter: marginal mean and 90 % credible interval [q05, q95] (linear
interpolation of the marginal CDF), widened if needed so that it contains the mean.
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


def _utilities(decision: Decision, lam: np.ndarray, theta: np.ndarray, eta: np.ndarray) -> dict:
    """Utility of every available action, broadcast over the (lam, theta, eta) grid."""
    d = decision.portfolio_drawdown
    zeros = np.zeros(np.broadcast_shapes(lam.shape, theta.shape, eta.shape))
    u: dict[Action, np.ndarray] = {}
    for a in decision.available_actions:
        if a == Action.SELL_ALL:
            u[a] = zeros + (d - theta) / TAU
        elif a in (Action.HOLD, Action.STAY_OUT):
            u[a] = zeros
        elif a == Action.CONTRIBUTE:
            u[a] = zeros + (C0 - lam * d) / TAU_C
        elif a == Action.BUY_BACK:
            u[a] = zeros + (theta - d) / TAU - INERTIA
        else:
            u[a] = zeros - (RAISE_SHARE[a] - eta) ** 2 / TAU_ETA
    return u


def log_likelihood_grid(decisions: list[Decision]) -> np.ndarray:
    """log L on the full grid, shape (len(LAMBDA_GRID), len(THETA_GRID), len(ETA_GRID))."""
    lam = LAMBDA_GRID[:, None, None]
    theta = THETA_GRID[None, :, None]
    eta = ETA_GRID[None, None, :]
    total = np.zeros((len(LAMBDA_GRID), len(THETA_GRID), len(ETA_GRID)))
    for dec in decisions:
        if dec.timed_out:
            continue  # not a real choice
        u = _utilities(dec, lam, theta, eta)
        stacked = np.stack(list(u.values()))
        m = stacked.max(axis=0)
        log_norm = m + np.log(np.exp(stacked - m).sum(axis=0))
        total += u[dec.action] - log_norm
    return total


def action_probabilities(decision: Decision, lam: float, theta: float, eta: float) -> dict:
    """P(a | params) for one decision at a single parameter point (reference, scalar)."""
    u = _utilities(decision, np.array(lam), np.array(theta), np.array(eta))
    vals = {a: float(v) for a, v in u.items()}
    m = max(vals.values())
    z = sum(np.exp(v - m) for v in vals.values())
    return {a: float(np.exp(v - m) / z) for a, v in vals.items()}


def _summary(name: str, grid: np.ndarray, weights: np.ndarray) -> ParameterEstimate:
    mean = float(np.dot(grid, weights))
    cdf = np.cumsum(weights)
    low = float(np.interp(0.05, cdf, grid))
    high = float(np.interp(0.95, cdf, grid))
    return ParameterEstimate(
        name=name,
        mean=mean,
        ci_low=min(low, mean),
        ci_high=max(high, mean),
        description=DESCRIPTIONS[name],
    )


def estimate_posterior(decisions: list[Decision]) -> Posterior:
    """Grid posterior over (lambda, theta, eta) from the game decisions."""
    log_l = log_likelihood_grid(decisions)
    w = np.exp(log_l - log_l.max())
    w /= w.sum()
    marginals = {
        "lambda": w.sum(axis=(1, 2)),
        "theta": w.sum(axis=(0, 2)),
        "eta": w.sum(axis=(0, 1)),
    }
    grids = {"lambda": LAMBDA_GRID, "theta": THETA_GRID, "eta": ETA_GRID}
    marginals = {k: v / v.sum() for k, v in marginals.items()}
    return Posterior(
        grid={k: [float(x) for x in g] for k, g in grids.items()},
        marginals={k: [float(x) for x in v] for k, v in marginals.items()},
        summary=[_summary(k, grids[k], marginals[k]) for k in ("lambda", "theta", "eta")],
        n_decisions=sum(1 for d in decisions if not d.timed_out),
        provisional=False,
    )
