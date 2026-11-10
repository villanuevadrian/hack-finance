"""Load the catalog snapshot from disk (the core never reads disk; the API does)."""

import json
import os
from functools import lru_cache
from pathlib import Path

from contracts import Catalog

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CATALOG = REPO_ROOT / "data" / "catalog" / "myinvestor_carteras_2026-11-08.json"


def load_catalog(path: Path) -> Catalog:
    with path.open(encoding="utf-8") as f:
        return Catalog.model_validate(json.load(f))


@lru_cache(maxsize=1)
def get_catalog() -> Catalog:
    """Catalog from CATALOG_PATH (env) or the default snapshot."""
    return load_catalog(Path(os.environ.get("CATALOG_PATH", DEFAULT_CATALOG)))
