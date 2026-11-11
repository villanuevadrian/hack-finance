# BehaviorLab: comandos del proyecto. Todo se instala en .venv (nada global).
PYTHON ?= python3.12
VENV   := .venv
BIN    := $(VENV)/bin

LOCK   := requirements-lock.txt

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

run-api: ## Arranca la API en http://127.0.0.1:8000 (docs en /docs). Carga .env si existe
	@if [ -f .env ]; then echo "Cargando variables de .env"; else echo "Sin .env: Vega responde con preguntas frecuentes"; fi
	@set -a; if [ -f .env ]; then . ./.env; fi; set +a; exec $(BIN)/uvicorn api.main:app --reload

setup-web: ## Instala el frontend (Node >= 20.19) con las versiones exactas de package-lock.json
	@command -v npm >/dev/null || { echo "Falta Node.js (>= 20.19). Instálalo desde https://nodejs.org"; exit 1; }
	cd frontend && npm ci --no-audit --no-fund

run-web: ## Arranca el frontend en http://localhost:5173 (necesita make run-api en otra terminal)
	@test -d frontend/node_modules || { echo "Primero: make setup-web"; exit 1; }
	cd frontend && npm run dev

test-web: ## Tests, lint y build del frontend
	cd frontend && npm test && npm run lint && npm run build

validate: ## Batería de validación -> reports/validation.md (pendiente)
	@echo "validate pendiente: lo implementa Datos (V1-V4)"; exit 1

clean:
	rm -rf $(VENV) .pytest_cache .ruff_cache *.egg-info frontend/node_modules frontend/dist
