"""Hypothesis invariants of the scenario generator."""

from hypothesis import given, settings
from hypothesis import strategies as st

from behaviorlab.scenarios import drawdown, generate_scenario, portfolio_path
from contracts import Episode


@settings(max_examples=60, deadline=None)
@given(seed=st.integers(0, 2**31 - 1), equity=st.floats(0, 100))
def test_any_seed_gives_valid_scenario(seed: int, equity: float) -> None:
    s = generate_scenario(seed)
    values = portfolio_path(s, equity)
    assert values[0] == 1
    assert min(values) > 0
    dd = drawdown(values)
    assert ((dd >= 0) & (dd < 1)).all()


@settings(max_examples=40, deadline=None)
@given(seed=st.integers(0, 2**31 - 1), episode=st.sampled_from(list(Episode)))
def test_deterministic_for_seed_and_episode(seed: int, episode: Episode) -> None:
    assert generate_scenario(seed, episode) == generate_scenario(seed, episode)
