# portfolio/
Simula la conducta estimada (θ muestreado del posterior) sobre las carteras del catálogo con las mismas trayectorias para todas, y elige según D5: máximo P10 de la riqueza final con P(venta en pánico) ≤ umbral. Nivel revelado = mayor nivel de riesgo con P(pánico) ≤ umbral; nivel final (D6) = mínimo de revelado, capacidad y horizonte. Fórmulas en el docstring de `selection.py`. Requisitos: RF-06. Dueño: Informática 1 (código); Datos co-revisa el criterio y la simulación.

Umbral de P(pánico): `DEFAULT_MAX_PANIC_PROB = 0,30` (decidido por Producto el 11-nov: con 0,20 se proponían carteras conservadoras incluso a quien aguanta). TODO(Amanda): la probabilidad de episodio de caída en las trayectorias (`episode_prob = 1`) sigue provisional.
