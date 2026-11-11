# inference/
Modelo de elección, posterior en rejilla sobre (λ, θ, η), intervalos creíbles y elección adaptativa de la siguiente situación. Requisitos: RF-04, RF-05. Dueño: Datos.

**Modelos:** `model.py` es el modelo de producción (Datos): softmax con el ruido de decisión y los despistes de cada persona marginalizados, posterior en rejilla e intervalos creíbles al 90 %. `reference.py` es la primera versión, con ruido fijo; se conserva como referencia de la validación. Fórmulas en los docstrings.
