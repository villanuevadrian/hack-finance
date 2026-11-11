"""V1: parameter recovery with simulated players of known parameters.

For each simulated player and each k in KS, the estimator sees only the first k decisions.
Per parameter and k we report (error = posterior mean - truth):
  bias      mean(error)
  MAE       mean(|error|)
  coverage  share of players whose truth lies in the reported 90 % credible interval
  width     mean width of that interval
  skill     1 - MAE / MAE_prior, where MAE_prior is the MAE of always answering the middle of the
            parameter range (what you know with zero decisions). 0 = no better than the prior.
"""

from collections.abc import Callable
from dataclasses import dataclass

import numpy as np

from behaviorlab.validation.simulate import (
    ETA_RANGE,
    GENERATORS,
    LAMBDA_RANGE,
    THETA_RANGE,
    play_game,
    sample_params,
)
from contracts import Catalog, Decision, OnboardingAnswers, Posterior

Estimator = Callable[[list[Decision]], Posterior]

KS = (3, 6, 9, 12, 15)
PARAMS = ("lambda", "theta", "eta")
RANGES = {"lambda": LAMBDA_RANGE, "theta": THETA_RANGE, "eta": ETA_RANGE}


@dataclass(frozen=True)
class Row:
    generator: str
    param: str
    k: int
    n: int
    bias: float
    mae: float
    coverage: float
    width: float
    skill: float


def _truth(params, name: str) -> float:
    return {"lambda": params.lam, "theta": params.theta, "eta": params.eta}[name]


def run_v1(
    estimator: Estimator,
    answers: OnboardingAnswers,
    catalog: Catalog,
    generator: str = "matched",
    n_players: int = 200,
    seed: int = 0,
    ks: tuple[int, ...] = KS,
) -> list[Row]:
    """Recovery table for one generator. Deterministic given `seed`."""
    rng = np.random.default_rng(seed)
    gen = GENERATORS[generator]
    games = []
    for _ in range(n_players):
        params = sample_params(rng)
        state = play_game(
            params, gen, seed=int(rng.integers(1, 2**31)), answers=answers, catalog=catalog, rng=rng
        )
        games.append((params, state.history))

    rows = []
    for k in ks:
        errs = {p: [] for p in PARAMS}
        cover = {p: [] for p in PARAMS}
        widths = {p: [] for p in PARAMS}
        prior_err = {p: [] for p in PARAMS}
        for params, history in games:
            post = estimator(history[:k])
            summ = {s.name: s for s in post.summary}
            for p in PARAMS:
                t = _truth(params, p)
                s = summ[p]
                errs[p].append(s.mean - t)
                cover[p].append(s.ci_low <= t <= s.ci_high)
                widths[p].append(s.ci_high - s.ci_low)
                lo, hi = RANGES[p]
                prior_err[p].append(abs((lo + hi) / 2 - t))
        for p in PARAMS:
            e = np.asarray(errs[p])
            mae = float(np.abs(e).mean())
            mae_prior = float(np.mean(prior_err[p]))
            rows.append(
                Row(
                    generator=generator,
                    param=p,
                    k=k,
                    n=len(e),
                    bias=float(e.mean()),
                    mae=mae,
                    coverage=float(np.mean(cover[p])),
                    width=float(np.mean(widths[p])),
                    skill=1 - mae / mae_prior,
                )
            )
    return rows


def format_rows(rows: list[Row]) -> str:
    out = [
        f"{'gen':8} {'param':7} {'k':>3} {'bias':>7} {'MAE':>6} "
        f"{'cov90':>6} {'width':>6} {'skill':>6}"
    ]
    for r in rows:
        out.append(
            f"{r.generator:8} {r.param:7} {r.k:3d} {r.bias:7.3f} {r.mae:6.3f} "
            f"{r.coverage:6.2f} {r.width:6.3f} {r.skill:6.2f}"
        )
    return "\n".join(out)


def main() -> None:  # pragma: no cover - manual baseline run
    """Usage: python -m behaviorlab.validation.v1_recovery [provisional|model] [n] [k,k,...]"""
    import sys

    from behaviorlab.inference import model, provisional
    from behaviorlab.validation.fixtures import base_answers, load_catalog

    estimators = {"provisional": provisional.estimate_posterior, "model": model.estimate_posterior}
    which = sys.argv[1] if len(sys.argv) > 1 else "provisional"
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 200
    ks = tuple(int(x) for x in sys.argv[3].split(",")) if len(sys.argv) > 3 else KS
    all_rows: list[Row] = []
    for g in GENERATORS:
        all_rows += run_v1(
            estimators[which], base_answers(), load_catalog(), generator=g, n_players=n, ks=ks
        )
    print(f"# estimator: {which}, players per generator: {n}")
    print(format_rows(all_rows))


if __name__ == "__main__":
    main()
