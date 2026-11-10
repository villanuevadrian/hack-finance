"""Seeded synthetic market for the game and for portfolio simulation (RF-01, D4).

Model (CALIBRACION.md §1): two synthetic indices, equity RV and bonds RF. The player's
portfolio is the constant-weight mix of its catalog portfolio:

    V_t = w_RV * RV_t / RV_0 + (1 - w_RV) * RF_t / RF_0   (buy-and-hold during the game)

Game path: the drop episode fixes the log-level of each index at the knot months
(0, 1 = peak, 5 = end of phase A, 10 = trough, 15 = end), with linear interpolation
in log space between knots. Monthly noise is a Brownian bridge pinned at every knot,
so peak, trough and end levels are exact and noise only moves intermediate months:

    log I_t = knot_interp(t) + B_t,   B_t = W_t - ((t - a)/(b - a)) W_b  on each [a, b]
    W_t = sum of correlated N(0, (vol / sqrt(12) * noise_scale)^2) shocks
"""

import math

import numpy as np

from behaviorlab.scenarios.calibration import (
    END_A,
    END_B,
    END_C,
    EPISODES,
    FALSE_REBOUND_RISE,
    MIN_REALISTIC_RV_DROP,
    N_ROUNDS,
    PEAK_MONTH,
    PRE_RISE_RF,
    PRE_RISE_RV,
    RAISE_ROUNDS,
    RF_MU,
    RF_VOL,
    RV_MU,
    RV_RF_CORR,
    RV_VOL,
    SALARY_RAISES_EUR,
    EpisodeSpec,
)
from contracts import Episode, Phase, RoundKind, Scenario, Situation


def blended_return(equity_weight: float, rv_return: float, rf_return: float) -> float:
    """Single-period portfolio return: r_p = w * r_RV + (1 - w) * r_RF."""
    return equity_weight * rv_return + (1 - equity_weight) * rf_return


def episode_portfolio_drop(episode: Episode, equity_weight: float) -> float:
    """Drop of a portfolio over the whole episode drop (CALIBRACION.md §4 table).

    drop_p = w * rv_drop + (1 - w) * rf_move
    """
    spec = EPISODES[episode]
    return blended_return(equity_weight, spec.rv_drop, spec.rf_move)


def rv_drop_for_target(target_drop: float, equity_weight: float, rf_move: float) -> float | None:
    """Equity drop needed so that the portfolio drops `target_drop` (CALIBRACION.md §6).

    rv_drop = (target - (1 - w) * rf_move) / w. Returns None when w == 0 or the result
    is below MIN_REALISTIC_RV_DROP (then the `inflacion` episode must be used).
    """
    if equity_weight <= 0:
        return None
    rv_drop = (target_drop - (1 - equity_weight) * rf_move) / equity_weight
    return None if rv_drop < MIN_REALISTIC_RV_DROP else rv_drop


def _knot_values(spec: EpisodeSpec) -> tuple[dict[int, float], dict[int, float]]:
    """Log-levels of RV and RF at the knot months of the 15-round game."""
    rv_peak = math.log1p(PRE_RISE_RV)
    rv_drop = math.log1p(spec.rv_drop)
    rv_trough = rv_peak + rv_drop
    rv = {
        0: 0.0,
        PEAK_MONTH: rv_peak,
        END_A: rv_peak + spec.first_leg_share * rv_drop,
        END_B: rv_trough,
        END_C: rv_trough - spec.recovery_share * rv_drop,
    }
    if spec.false_rebound:
        rv[END_B + 2] = rv_trough + math.log1p(FALSE_REBOUND_RISE)
        rv[END_B + 3] = rv_trough

    rf_peak = math.log1p(PRE_RISE_RF)
    rf_move = math.log1p(spec.rf_move)
    rf_end_b = rf_peak + rf_move
    rf_end_c = (
        rf_end_b - spec.recovery_share * rf_move
        if spec.rf_move < 0
        else rf_end_b + (END_C - END_B) * math.log1p(RF_MU) / 12
    )
    rf = {
        0: 0.0,
        PEAK_MONTH: rf_peak,
        END_A: rf_peak + spec.first_leg_share * rf_move,
        END_B: rf_end_b,
        END_C: rf_end_c,
    }
    return rv, rf


def _interpolate(knots: dict[int, float], n_months: int) -> np.ndarray:
    months = sorted(knots)
    return np.interp(np.arange(n_months + 1), months, [knots[m] for m in months])


def _bridge(shocks: np.ndarray, knot_months: list[int]) -> np.ndarray:
    """Brownian bridge pinned to 0 at every knot month. shocks[t-1] is the shock of month t."""
    walk = np.concatenate([[0.0], np.cumsum(shocks)])
    out = np.zeros_like(walk)
    for a, b in zip(knot_months[:-1], knot_months[1:], strict=True):
        segment = walk[a : b + 1] - walk[a]
        frac = np.arange(b - a + 1) / (b - a)
        out[a : b + 1] = segment - frac * segment[-1]
    return out


def _correlated_shocks(
    rng: np.random.Generator, n: int, corr: float, noise_scale: float
) -> tuple[np.ndarray, np.ndarray]:
    """Monthly shocks with sd = vol / sqrt(12) * noise_scale and correlation `corr`."""
    z1 = rng.standard_normal(n)
    z2 = corr * z1 + math.sqrt(1 - corr**2) * rng.standard_normal(n)
    scale = noise_scale / math.sqrt(12)
    return z1 * RV_VOL * scale, z2 * RF_VOL * scale


def _phase_of(round_index: int) -> Phase:
    if round_index <= END_A:
        return Phase.DROP
    if round_index <= END_B:
        return Phase.SALARY
    return Phase.RECOVERY


def generate_scenario(
    seed: int, episode: Episode | None = None, noise_scale: float = 1.0
) -> Scenario:
    """Build the 15-round scenario for one game. Same seed (and args) -> same scenario."""
    rng = np.random.default_rng(seed)
    episodes = list(Episode)
    chosen = episodes[int(rng.integers(len(episodes)))] if episode is None else episode
    raises = [float(x) for x in rng.permutation(SALARY_RAISES_EUR)]
    spec = EPISODES[chosen]

    rv_knots, rf_knots = _knot_values(spec)
    rv_shock, rf_shock = _correlated_shocks(rng, N_ROUNDS, spec.correlation, noise_scale)
    rv_log = _interpolate(rv_knots, N_ROUNDS) + _bridge(rv_shock, sorted(rv_knots))
    rf_log = _interpolate(rf_knots, N_ROUNDS) + _bridge(rf_shock, sorted(rf_knots))
    rv_path = np.exp(rv_log)
    rf_path = np.exp(rf_log)

    raise_iter = iter(raises)
    situations = []
    for r in range(1, N_ROUNDS + 1):
        is_raise = r in RAISE_ROUNDS
        situations.append(
            Situation(
                round_index=r,
                phase=_phase_of(r),
                kind=RoundKind.RAISE if is_raise else RoundKind.MARKET,
                rv_return=float(rv_path[r] / rv_path[r - 1] - 1),
                rf_return=float(rf_path[r] / rf_path[r - 1] - 1),
                salary_raise_eur=next(raise_iter) if is_raise else 0.0,
            )
        )
    return Scenario(
        seed=seed,
        episode=chosen,
        rv_path=[float(x) for x in rv_path],
        rf_path=[float(x) for x in rf_path],
        situations=situations,
        calibration={
            "rv_vol": RV_VOL,
            "rf_vol": RF_VOL,
            "correlation": spec.correlation,
            "rv_drop": spec.rv_drop,
            "rf_move": spec.rf_move,
            "noise_scale": noise_scale,
        },
    )


def portfolio_path(scenario: Scenario, equity_pct: float) -> list[float]:
    """Value of 1 € invested at month 0, buy-and-hold over the game (annual rebalancing,
    the game lasts 15 months): V_t = w * RV_t / RV_0 + (1 - w) * RF_t / RF_0.

    Monthly rebalancing would deepen long drops by up to ~4 pp versus the catalog table.
    """
    w = equity_pct / 100
    rv0, rf0 = scenario.rv_path[0], scenario.rf_path[0]
    return [
        w * rv / rv0 + (1 - w) * rf / rf0
        for rv, rf in zip(scenario.rv_path, scenario.rf_path, strict=True)
    ]


def drawdown(values: list[float] | np.ndarray) -> np.ndarray:
    """Drawdown from the running peak: d_t = 1 - V_t / max_{s<=t} V_s (0 = at the peak)."""
    arr = np.asarray(values, dtype=float)
    return 1 - arr / np.maximum.accumulate(arr, axis=-1)


def _episode_log_increments(episode: Episode) -> tuple[np.ndarray, np.ndarray]:
    """Monthly log moves of the episode from the peak to the end (months 2..15)."""
    rv_knots, rf_knots = _knot_values(EPISODES[episode])
    rv = np.diff(_interpolate(rv_knots, N_ROUNDS))[PEAK_MONTH:]
    rf = np.diff(_interpolate(rf_knots, N_ROUNDS))[PEAK_MONTH:]
    return rv, rf


def simulate_monthly_returns(
    rng: np.random.Generator, n_paths: int, n_months: int, episode_prob: float = 1.0
) -> tuple[np.ndarray, np.ndarray]:
    """Monthly returns (n_paths, n_months) of RV and RF for portfolio simulation.

    Base: correlated lognormal returns, log r ~ N((mu - vol^2/2)/12, vol^2/12).
    Stress: each path contains, with probability `episode_prob` (default 1: every path),
    one drop episode chosen uniformly at random, starting at a random month; during it
    the drift is replaced by the episode's log moves (noise is kept). Synthetic paths
    may still understate extreme tails.
    """
    z1 = rng.standard_normal((n_paths, n_months))
    z2 = RV_RF_CORR * z1 + math.sqrt(1 - RV_RF_CORR**2) * rng.standard_normal((n_paths, n_months))
    rv_drift = np.full((n_paths, n_months), (RV_MU - RV_VOL**2 / 2) / 12)
    rf_drift = np.full((n_paths, n_months), (RF_MU - RF_VOL**2 / 2) / 12)
    if not 0 <= episode_prob <= 1:
        raise ValueError("episode_prob must be in [0, 1]")
    episodes = list(Episode)
    choice = rng.integers(len(episodes), size=n_paths)
    has_episode = rng.random(n_paths) < episode_prob
    for i in range(n_paths):
        if has_episode[i]:
            rv_inc, rf_inc = _episode_log_increments(episodes[int(choice[i])])
            length = min(len(rv_inc), n_months)
            start = int(rng.integers(n_months - length + 1))
            rv_drift[i, start : start + length] = rv_inc[:length]
            rf_drift[i, start : start + length] = rf_inc[:length]
    rv_log = rv_drift + z1 * RV_VOL / math.sqrt(12)
    rf_log = rf_drift + z2 * RF_VOL / math.sqrt(12)
    return np.expm1(rv_log), np.expm1(rf_log)
