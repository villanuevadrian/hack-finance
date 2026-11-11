"""Inference (Datos). The API uses the robust model of `model.py` (noise and lapses marginalised).

`reference.py` is the first model with fixed noise, kept as the reference of the validation.
"""

from behaviorlab.inference.model import estimate_posterior

__all__ = ["estimate_posterior"]
