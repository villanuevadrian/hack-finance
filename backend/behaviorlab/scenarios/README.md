# scenarios/
Generador de trayectorias de mercado sintéticas, calibradas con el catálogo y con semilla. Requisitos: RF-01. Dueño: Industrial (diseño) + Informática 1 (código).

Implementación (10-nov): `calibration.py` (parámetros de `CALIBRACION.md` + forma de cada episodio en 15 rondas, revisada y aceptada por Producto el 11-nov) y `generator.py` (índices RV/RF con ruido de puente browniano anclado en pico, valle y final; cartera comprar-y-mantener durante la partida, que equivale al rebalanceo anual; trayectorias de varios años para `portfolio/` con `episode_prob` configurable).
