# BehaviorLab: comandos del proyecto. Todo se instala en .venv (nada global).
PYTHON ?= python3.12
VENV   := .venv
BIN    := $(VENV)/bin

LOCK   := requirements-lock.txt
API_PORT ?= 8000
WEB_PORT ?= 5280

.PHONY: setup setup-web lock test test-web lint format run-api run-web validate clean

setup: ## Crea .venv e instala el proyecto con las versiones exactas de requirements-lock.txt
	@command -v $(PYTHON) >/dev/null || { echo "Falta $(PYTHON). Instala Python 3.12 o usa: make setup PYTHON=/ruta/a/python3.12"; exit 1; }
	$(PYTHON) -m venv $(VENV)
	$(BIN)/python -m pip install --upgrade pip
	$(BIN)/python -m pip install -c $(LOCK) -e ".[dev]"

lock: ## Reescribe requirements-lock.txt con lo instalado en .venv (tras cambiar dependencias y pasar make test)
	@{ echo "# Versiones exactas probadas con make test. Se aplican como restricciones en make setup."; \
	   echo "# Regenerar con: make lock"; \
	   $(BIN)/python -m pip freeze --exclude-editable | grep -v '^behaviorlab'; } > $(LOCK)
	@echo "$(LOCK) actualizado"

test: ## Ejecuta todos los tests
	$(BIN)/pytest

lint: ## Comprueba estilo y formato (no modifica nada)
	$(BIN)/ruff check .
	$(BIN)/ruff format --check .

format: ## Arregla formato y lo que ruff pueda corregir solo
	$(BIN)/ruff format .
	$(BIN)/ruff check --fix .

run-api: ## Arranca la API en http://127.0.0.1:$(API_PORT) (docs en /docs). Carga .env si existe
	@if [ -f .env ]; then echo "Cargando variables de .env"; else echo "Sin .env: Vega responde con preguntas frecuentes"; fi
	@set -a; if [ -f .env ]; then . ./.env; fi; set +a; exec $(BIN)/uvicorn api.main:app --reload --port $(API_PORT)

setup-web: ## Instala el frontend (Node >= 20.19) con las versiones exactas de package-lock.json
	@command -v npm >/dev/null || { echo "Falta Node.js (>= 20.19). Instálalo desde https://nodejs.org"; exit 1; }
	cd frontend && npm ci --no-audit --no-fund

run-web: ## Arranca el frontend en http://localhost:$(WEB_PORT) (necesita make run-api en otra terminal)
	@test -d frontend/node_modules || { echo "Primero: make setup-web"; exit 1; }
	cd frontend && VITE_API_URL=$${VITE_API_URL:-http://localhost:$(API_PORT)} npm run dev -- --port $(WEB_PORT) --strictPort

test-web: ## Tests, lint y build del frontend
	cd frontend && npm test && npm run lint && npm run build

validate: ## Batería de validación (V1, V1b, V2, V4) -> reports/validation.md
	$(BIN)/python scripts/validate.py

clean:
	rm -rf $(VENV) .pytest_cache .ruff_cache *.egg-info frontend/node_modules frontend/dist
