"""Simulate the estimated behaviour on each catalog portfolio and choose one (RF-06, D5, D6).

For every candidate the SAME market paths and the SAME theta samples are used (common
random numbers), so differences come only from the portfolio.

Per path i with a theta_i drawn from the posterior marginal of theta:
    V_0 = 1;  within each year buy-and-hold, weights reset every 12 months:
        V_t = V_{y} * (w * RV_t / RV_y + (1 - w) * RF_t / RF_y),  y = start of the year
    drawdown_t = 1 - V_t / max_{s<=t} V_s
    panic_i = exists t: drawdown_t >= theta_i  -> sell, V stays constant afterwards (cash)
    final multiple M_i = V_T

    P(panic) = mean(panic_i);  P10, P50, P90 = quantiles of M_i

D5: among eligible portfolios, choose argmax P10(M) subject to P(panic) <= max_panic_prob;
if none qualifies, the one with the lowest P(panic) (ties -> lower risk level).
D6: revealed level = highest risk level with P(panic) <= max_panic_prob (0 if none);
    final = min(revealed, capacity, horizon).
"""

import numpy as np

from behaviorlab.scenarios import simulate_monthly_returns
from contracts import CandidateMetrics, Catalog, Posterior, SuitabilityLevels

# TODO(Álvaro, Amanda): D5 threshold "lo fijan Producto y Datos". Provisional value.
DEFAULT_MAX_PANIC_PROB = 0.20
DEFAULT_N_PATHS = 2_000


def sample_theta(posterior: Posterior, rng: np.random.Generator, n: int) -> np.ndarray:
    """Draw n values of theta from its posterior marginal."""
    grid = np.asarray(posterior.grid["theta"])
    weights = np.asarray(posterior.marginals["theta"])
    return rng.choice(grid, size=n, p=weights / weights.sum())


def simulate_candidate(
    equity_weight: float, rv_returns: np.ndarray, rf_returns: np.ndarray, thetas: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    """Final multiples and panic flags of one portfolio (formulas in the module docstring)."""
    n_paths, n_months = rv_returns.shape
    value = np.ones(n_paths)
    year_start_value = np.ones(n_paths)
    rv_level = np.ones(n_paths)
    rf_level = np.ones(n_paths)
    peak = np.ones(n_paths)
    panicked = np.zeros(n_paths, dtype=bool)
    for t in range(n_months):
        if t % 12 == 0:
            year_start_value = value.copy()
            rv_level[:] = 1.0
            rf_level[:] = 1.0
        rv_level *= 1 + rv_returns[:, t]
        rf_level *= 1 + rf_returns[:, t]
        new_value = year_start_value * (equity_weight * rv_level + (1 - equity_weight) * rf_level)
        value = np.where(panicked, value, new_value)
        peak = np.maximum(peak, value)
        panicked |= (1 - value / peak) >= thetas
    return value, panicked


def evaluate_candidates(
    posterior: Posterior,
    catalog: Catalog,
    horizon_years: int,
    max_eligible_level: int,
    seed: int,
    n_paths: int = DEFAULT_N_PATHS,
) -> list[CandidateMetrics]:
    """Metrics of every catalog portfolio on common paths; `eligible` marks risk <= max."""
    rng = np.random.default_rng(seed)
    n_months = 12 * horizon_years
    rv, rf = simulate_monthly_returns(rng, n_paths, n_months)
    thetas = sample_theta(posterior, rng, n_paths)
    out = []
    for p in sorted(catalog.portfolios, key=lambda x: x.risk_level):
        final, panicked = simulate_candidate(p.equity_weight, rv, rf, thetas)
        q10, q50, q90 = np.quantile(final, [0.10, 0.50, 0.90])
        out.append(
            CandidateMetrics(
                portfolio_id=p.id,
                name=p.name,
                risk_level=p.risk_level,
                eligible=p.risk_level <= max_eligible_level,
                p_panic=float(panicked.mean()),
                final_multiple_p10=float(q10),
                final_multiple_p50=float(q50),
                final_multiple_p90=float(q90),
            )
        )
    return out


def revealed_level(candidates: list[CandidateMetrics], max_panic_prob: float) -> int:
    """Highest risk level the player would hold with P(panic) <= threshold (0 if none)."""
    ok = [c.risk_level for c in candidates if c.p_panic <= max_panic_prob]
    return max(ok) if ok else 0


def suitability_levels(revealed: int, capacity: int, horizon: int) -> SuitabilityLevels:
    """D6: final = min of the three; `limiting` lists those equal to the final level."""
    values = {"revealed": revealed, "capacity": capacity, "horizon": horizon}
    final = min(values.values())
    return SuitabilityLevels(
        revealed=revealed,
        capacity=capacity,
        horizon=horizon,
        final=final,
        limiting=[k for k, v in values.items() if v == final],
    )


def select_portfolio(
    candidates: list[CandidateMetrics], final_level: int, max_panic_prob: float
) -> CandidateMetrics:
    """D5 among candidates with risk_level <= final_level."""
    pool = [c for c in candidates if c.risk_level <= final_level]
    if not pool:
        pool = [min(candidates, key=lambda c: c.risk_level)]
    safe = [c for c in pool if c.p_panic <= max_panic_prob]
    if safe:
        return max(safe, key=lambda c: (c.final_multiple_p10, -c.risk_level))
    return min(pool, key=lambda c: (c.p_panic, c.risk_level))
