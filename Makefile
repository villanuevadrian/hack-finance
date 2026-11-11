# BehaviorLab: comandos del proyecto. Todo se instala en .venv (nada global).
PYTHON ?= python3.12
VENV   := .venv
BIN    := $(VENV)/bin

LOCK   := requirements-lock.txt

.PHONY: setup lock test lint format run-api run-web validate clean

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

run-web: ## Frontend: pendiente de D8 (React/Vite o Streamlit)
	@echo "run-web pendiente: se define al cerrar D8 (ver docs/DUDAS.md)"; exit 1

validate: ## Batería de validación -> reports/validation.md (pendiente)
	@echo "validate pendiente: lo implementa Datos (V1-V4)"; exit 1

clean:
	rm -rf $(VENV) .pytest_cache .ruff_cache *.egg-info
