"""Smoke tests: the environment is the one every teammate should have."""

import importlib
import sys

import pytest


def test_python_version_is_312() -> None:
    assert sys.version_info[:2] == (3, 12)


@pytest.mark.parametrize(
    "module",
    [
        "numpy",
        "scipy",
        "pydantic",
        "fastapi",
        "hypothesis",
        "contracts",
        "behaviorlab",
        "behaviorlab.scenarios",
        "behaviorlab.game",
        "behaviorlab.inference",
        "behaviorlab.portfolio",
        "behaviorlab.validation",
        "behaviorlab.text",
        "api",
    ],
)
def test_module_imports(module: str) -> None:
    importlib.import_module(module)


def test_pydantic_is_v2() -> None:
    import pydantic

    assert int(pydantic.VERSION.split(".")[0]) == 2
