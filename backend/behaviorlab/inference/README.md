# inference/
Modelo de elección, posterior en rejilla sobre (λ, θ, η), intervalos creíbles y elección adaptativa de la siguiente situación. Requisitos: RF-04, RF-05. Dueño: Datos.

**Estado (10-nov):** `provisional.py` es una versión **provisional escrita por Núcleo** para desbloquear la demo (softmax con τ fijo y posterior en rejilla uniforme; fórmulas en el docstring). Todo `Posterior` que produce lleva `provisional=True` y el `Profile`, `provisional_model=True`. TODO(Amanda): sustituirla manteniendo la firma `estimate_posterior(decisions: list[Decision]) -> Posterior`, o avisar a Núcleo si cambia.
