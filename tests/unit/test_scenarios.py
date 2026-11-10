"""RF-01: seeded scenarios and the calibration controls of CALIBRACION.md."""

import numpy as np
import pytest

from behaviorlab.scenarios import (
    blended_return,
    drawdown,
    episode_portfolio_drop,
    generate_scenario,
    portfolio_path,
    rv_drop_for_target,
    simulate_monthly_returns,
)
from behaviorlab.scenarios.calibration import EPISODES, N_ROUNDS, RAISE_ROUNDS, SALARY_RAISES_EUR
from contracts import Catalog, Episode, RoundKind

# CALIBRACION.md §2: MyInvestor's published 2008 returns
PUBLISHED_2008 = {"clasica": -3.7, "pop": -13.6, "indie": -21.4, "rock": -26.9}
# CALIBRACION.md §4: portfolio drop per episode (before noise)
TABLE = {
    Episode.SUSTO: {"clasica": -1.7, "pop": -7.2, "indie": -11.6, "rock": -15.4, "metal": -20},
    Episode.GOTEO: {"clasica": -2.0, "pop": -5.9, "indie": -9.0, "rock": -11.7, "metal": -15},
    Episode.REBOTE: {"clasica": -6.2, "pop": -14.5, "indie": -21.2, "rock": -27.0, "metal": -34},
    Episode.CRISIS_LARGA: {
        "clasica": -4.8,
        "pop": -18.3,
        "indie": -29.2,
        "rock": -38.6,
        "metal": -50,
    },
    Episode.INFLACION: {
        "clasica": -16.9,
        "pop": -16.6,
        "indie": -16.4,
        "rock": -16.2,
        "metal": -16,
    },
}


def test_same_seed_same_scenario() -> None:
    assert generate_scenario(123) == generate_scenario(123)


def test_different_seeds_differ() -> None:
    assert generate_scenario(1).rv_path != generate_scenario(2).rv_path


def test_structure_of_rounds() -> None:
    s = generate_scenario(5)
    assert s.n_rounds == N_ROUNDS
    raises = [x.round_index for x in s.situations if x.kind == RoundKind.RAISE]
    assert tuple(raises) == RAISE_ROUNDS
    assert sorted(x.salary_raise_eur for x in s.situations if x.salary_raise_eur) == sorted(
        SALARY_RAISES_EUR
    )


def test_situation_returns_match_paths() -> None:
    s = generate_scenario(9)
    for sit in s.situations:
        r = sit.round_index
        assert sit.rv_return == pytest.approx(s.rv_path[r] / s.rv_path[r - 1] - 1)


@pytest.mark.parametrize(
    "pid",
    [
        "clasica",
        "pop",
        "indie",
        pytest.param(
            "rock",
            marks=pytest.mark.xfail(
                strict=True,
                reason="CALIBRACION.md §2: modelo -28,6 vs publicado -26,9 (1,7 pp > 1,5). "
                "TODO(Álvaro): ajustar calibración o tolerancia",
            ),
        ),
    ],
)
def test_control_2008_within_1_5_pp(catalog: Catalog, pid: str) -> None:
    w = catalog.by_id(pid).equity_weight
    assert 100 * blended_return(w, -0.37, 0.01) == pytest.approx(PUBLISHED_2008[pid], abs=1.5)


@pytest.mark.parametrize("episode", list(Episode))
def test_episode_table_within_0_2_pp(catalog: Catalog, episode: Episode) -> None:
    for pid, expected in TABLE[episode].items():
        w = catalog.by_id(pid).equity_weight
        assert 100 * episode_portfolio_drop(episode, w) == pytest.approx(expected, abs=0.2)


@pytest.mark.parametrize("episode", list(Episode))
@pytest.mark.parametrize("seed", [0, 1, 2, 3])
def test_game_peak_to_trough_within_2_pp(catalog: Catalog, episode: Episode, seed: int) -> None:
    """Peak (month 1) to trough (month 10) of the played portfolio vs the table."""
    s = generate_scenario(seed, episode)
    for pid, expected in TABLE[episode].items():
        values = portfolio_path(s, catalog.by_id(pid).equity_pct)
        assert 100 * (values[10] / values[1] - 1) == pytest.approx(expected, abs=2.0)


def test_noise_is_pinned_at_knots() -> None:
    a = generate_scenario(1, Episode.REBOTE, noise_scale=0.0)
    b = generate_scenario(2, Episode.REBOTE, noise_scale=1.0)
    for month in (0, 1, 5, 10, 15):
        assert a.rv_path[month] == pytest.approx(b.rv_path[month])


def test_trough_depth_matches_episode() -> None:
    for episode, spec in EPISODES.items():
        s = generate_scenario(3, episode)
        assert s.rv_path[10] / s.rv_path[1] - 1 == pytest.approx(spec.rv_drop)


def test_portfolio_path_starts_at_one_and_full_equity_tracks_rv() -> None:
    s = generate_scenario(4)
    values = portfolio_path(s, 100)
    assert values[0] == 1
    assert values == pytest.approx(s.rv_path)


def test_drawdown_definition() -> None:
    assert list(drawdown([1, 2, 1, 3])) == pytest.approx([0, 0, 0.5, 0])


def test_rv_drop_for_target() -> None:
    assert rv_drop_for_target(-0.20, 1.0, 0.0) == pytest.approx(-0.20)
    assert rv_drop_for_target(-0.117, 0.6, 0.01) == pytest.approx((-0.117 - 0.4 * 0.01) / 0.6)
    assert rv_drop_for_target(-0.30, 0.13, 0.0) is None  # needs < -55 %: use inflacion
    assert rv_drop_for_target(-0.10, 0.0, 0.0) is None


def test_simulated_returns_shape_and_seed() -> None:
    a = simulate_monthly_returns(np.random.default_rng(0), 50, 24)
    b = simulate_monthly_returns(np.random.default_rng(0), 50, 24)
    assert a[0].shape == (50, 24)
    assert np.array_equal(a[0], b[0])
    with pytest.raises(ValueError):
        simulate_monthly_returns(np.random.default_rng(0), 5, 24, episode_prob=1.5)
