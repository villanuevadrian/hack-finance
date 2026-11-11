"""Headlines: never figures, and the templates when there is no cache."""

import json
from pathlib import Path

from behaviorlab.text.headlines import BUCKETS, TEMPLATES, load_bank, valid


def test_templates_follow_the_rules() -> None:
    for bucket in BUCKETS:
        assert TEMPLATES[bucket]
        assert all(valid(h) for h in TEMPLATES[bucket])


def test_figures_are_rejected() -> None:
    assert not valid("La bolsa cae un 5 % en un mes")
    assert not valid("Pérdidas de 300 € por inversor")


def test_missing_cache_falls_back_to_templates(tmp_path: Path) -> None:
    source, bank = load_bank(tmp_path / "nope.json")
    assert source == "templates"
    assert bank == TEMPLATES


def test_cache_with_figures_is_filtered(tmp_path: Path) -> None:
    path = tmp_path / "h.json"
    good = {b: ["Titular correcto sin ninguna cifra"] for b in BUCKETS}
    good["drop"] = ["La bolsa cae un 5 %", "Las bolsas cierran en rojo otra vez"]
    path.write_text(json.dumps({"source": "claude", "headlines": good}), encoding="utf-8")
    source, bank = load_bank(path)
    assert source == "claude"
    assert bank["drop"] == ["Las bolsas cierran en rojo otra vez"]
