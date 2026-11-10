"""Calibration constants. Market numbers come from scenarios/CALIBRACION.md (Producto).

Shape parameters of each episode (how the drop is split between phases and how much
is recovered) are game-design choices added by Núcleo to turn the episode table into
15 monthly rounds. TODO(Álvaro): review the `first_leg_share`, `recovery_share` and
`PRE_RISE_*` values below.
"""

from dataclasses import dataclass

from contracts import Episode

# CALIBRACION.md §2 (annual figures)
# TODO(Álvaro): Cartera Ahorro (monetarios) has no backtest and is simulated as the RF
# index (7,5 % vol), which overstates its risk. It needs its own volatility.
RV_VOL = 0.125
RF_VOL = 0.075
RV_RF_CORR = 0.10
RV_RF_CORR_INFLATION = 0.45
RV_MU = 0.06
RF_MU = 0.025

# CALIBRACION.md §5: 15 rounds, 5 per phase; raise rounds of phase B
N_ROUNDS = 15
RAISE_ROUNDS = (6, 8, 10)
# CALIBRACION.md §6: monthly salary raises available in phase B
SALARY_RAISES_EUR = (100.0, 200.0, 300.0)

# Knots of the round structure (index of the month that closes each segment)
PEAK_MONTH = 1  # round 1: the portfolio comes from rising (reference point)
END_A = 5
END_B = 10
END_C = 15

# TODO(Álvaro): size of the rise in round 1 ("viene de subir"), design choice
PRE_RISE_RV = 0.03
PRE_RISE_RF = 0.002

# CALIBRACION.md §6: if the equity drop needed for a target portfolio drop is below this,
# the target is unrealistic and the `inflacion` episode is used instead.
MIN_REALISTIC_RV_DROP = -0.55


@dataclass(frozen=True)
class EpisodeSpec:
    """rv_drop / rf_move: CALIBRACION.md §4. The rest: shape over 15 rounds (Núcleo)."""

    rv_drop: float  # equity drop from peak to trough (−0.20 = −20 %)
    rf_move: float  # bond move over the same stretch
    first_leg_share: float  # share of the (log) drop that happens in phase A
    recovery_share: float  # share of the (log) drop recovered by the end of phase C
    false_rebound: bool = False  # phase C rises ~5 % and falls again

    @property
    def correlation(self) -> float:
        return RV_RF_CORR_INFLATION if self.rv_drop < 0 and self.rf_move < 0 else RV_RF_CORR


EPISODES: dict[Episode, EpisodeSpec] = {
    # "rápida" recovery, 3-month drop
    Episode.SUSTO: EpisodeSpec(-0.20, 0.01, first_leg_share=1.0, recovery_share=1.0),
    # slow and constant drop over A and B (4 of 9 months in A), slow recovery
    Episode.GOTEO: EpisodeSpec(-0.15, 0.00, first_leg_share=4 / 9, recovery_share=0.3),
    # very fast drop, strong recovery
    Episode.REBOTE: EpisodeSpec(-0.34, -0.02, first_leg_share=1.0, recovery_share=1.0),
    # long drop, very slow recovery with a false rebound
    Episode.CRISIS_LARGA: EpisodeSpec(
        -0.50, 0.02, first_leg_share=0.6, recovery_share=0.2, false_rebound=True
    ),
    # equity and bonds fall together, partial recovery
    Episode.INFLACION: EpisodeSpec(-0.16, -0.17, first_leg_share=0.6, recovery_share=0.5),
}

FALSE_REBOUND_RISE = 0.05  # CALIBRACION.md §6: "+5 % y vuelve a caer"
