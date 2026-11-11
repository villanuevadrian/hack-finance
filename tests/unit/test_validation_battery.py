"""Fast checks of the validation battery (small samples; the full run is `make validate`)."""

from behaviorlab.validation.battery import v1_recovery, v2_prediction, v4_invariants
from contracts import Catalog, OnboardingAnswers


def test_v1_intervals_are_roughly_calibrated(answers: OnboardingAnswers, catalog: Catalog) -> None:
    rows = {r.name: r for r in v1_recovery(answers, catalog, n_players=40, seed=11)}
    for r in rows.values():
        assert 0.75 <= r.coverage <= 1.0
    assert rows["theta"].mae < 0.08


def test_v2_game_beats_random(answers: OnboardingAnswers, catalog: Catalog) -> None:
    rows = {r.method: r for r in v2_prediction(answers, catalog, n_players=30, seed=3)}
    assert rows["juego"].lpd > rows["azar"].lpd
    assert rows["juego"].lpd >= rows["cuestionario"].lpd


def test_v4_weights_sum_to_one(answers: OnboardingAnswers, catalog: Catalog) -> None:
    assert v4_invariants(answers, catalog)["max_desviacion_suma_pesos"] < 1e-9
