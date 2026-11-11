"""Inference (Datos). The API uses the robust model of `model.py` (noise and lapse marginalised).

`provisional.py` is kept as the reference model used by the backup validation.
"""

from behaviorlab.inference.model import estimate_posterior

__all__ = ["estimate_posterior"]
