# Model - Carnot Heat Engine

This document describes the model — the underlying physics, maths, and behaviour —
in terms appropriate for an educator. It is the companion to
[implementation-notes.md](./implementation-notes.md), which targets developers.

## Overview

The simulation models one mole of an ideal gas taken around a **reversible,
quasi-static Carnot cycle**: four legs alternating between contact with a hot
reservoir, thermal isolation, contact with a cold reservoir, and thermal
isolation again. Everything is idealised — no friction, no finite-rate heat
transfer, no leaks — which is exactly the point: the Carnot cycle is the
efficiency *ceiling* against which real engines are measured.

The three things a student should leave with:

1. The four legs, in order, and what the gas and the reservoirs are doing on each.
2. That the efficiency of this cycle depends **only** on the two reservoir
   temperatures — not on the gas, not on how far the gas expands, not on how much
   gas there is.
3. That running the same four legs backwards turns the engine into a
   refrigerator, and that the same energy bookkeeping then reads as a COP.

## The four legs

Corner states are numbered in engine (clockwise on a PV diagram) order:

| Leg | Process | Reservoir | Heat | Work |
|---|---|---|---|---|
| 1 → 2 | isothermal expansion at T_hot | hot, in contact | Q_hot absorbed | done by the gas |
| 2 → 3 | adiabatic expansion, T_hot → T_cold | insulated | 0 | done by the gas |
| 3 → 4 | isothermal compression at T_cold | cold, in contact | Q_cold rejected | done on the gas |
| 4 → 1 | adiabatic compression, T_cold → T_hot | insulated | 0 | done on the gas |

Governing relations, all standard ideal-gas results:

- Ideal gas law: `PV = nRT`
- Isothermal leg: `W = nRT·ln(V_f/V_i)` and `ΔU = 0`, so `Q = W`
- Adiabatic leg: `PV^γ = const`, equivalently `TV^(γ−1) = const`, with `Q = 0` and
  `W = −ΔU = nC_v(T_i − T_f)`, where `C_v = R/(γ − 1)`

## Closing the cycle, and what the third slider actually controls

Given T_hot, T_cold and γ, the adiabatic relation fixes the volume ratio each
adiabatic leg must span:

```
τ = (T_hot / T_cold)^(1/(γ − 1))
```

One further number is needed to pin the cycle down. The simulation uses the
volume ratio across the hot isothermal leg, `r = V₂/V₁`, labelled **Expansion
Ratio V₂/V₁**. The other three corners follow:

```
V₁ = 10 L      V₂ = r·V₁      V₃ = τ·V₂      V₄ = τ·V₁
```

so `V₃/V₄ = r` as well — **both isothermal legs sweep the same volume ratio.**
That is the structural reason the efficiency simplifies, and it is worth pointing
out to students:

```
Q_hot  = nR·T_hot ·ln r
Q_cold = nR·T_cold·ln r
η = W/Q_hot = (Q_hot − Q_cold)/Q_hot = 1 − T_cold/T_hot
```

The ln r factor cancels. Neither how far the gas expands, nor how much gas there
is, nor which gas it is survives into η.

> **A note on "compression ratio".** The *overall* span V_max/V_min is not a free
> parameter: it equals `r·τ`, and τ alone reaches 8 for a monatomic gas at
> T_hot/T_cold = 4 (32 for a diatomic one). Asking for an overall span of, say, 4
> would leave no room for the adiabats and the cycle would have no solution. The
> free parameter therefore has to be the per-leg ratio; the resulting overall span
> is reported as a derived quantity.

## Entropy and the T–S view

Entropy changes only on the isothermal legs, by `ΔS = Q/T = nR·ln r` — the same
magnitude on both, since both sweep the same volume ratio. Plotted against
temperature the cycle is therefore a **rectangle**: width ΔS, height
T_hot − T_cold. Its area, `ΔS·(T_hot − T_cold)`, is the net work — the same net
work the PV loop encloses.

This is the deferred payoff for the Intro screen's PV-only framing, and it makes
η = 1 − T_cold/T_hot visible rather than algebraic: the two horizontal legs have
equal length, so the ratio of the heats is just the ratio of the heights.

## Running it backwards

The Reversed Cycle screen traverses the same four legs counter-clockwise. Nothing
about the corner points changes; `Q_hot`, `Q_cold` and `W` keep the same
magnitudes, and only the direction of every flow flips. Work now goes *in*, heat
is drawn *from* the cold reservoir and delivered *to* the hot one, and the figure
of merit becomes the coefficient of performance:

```
COP_cooling = Q_cold/W = T_cold/(T_hot − T_cold)
COP_heating = Q_hot /W = T_hot /(T_hot − T_cold) = COP_cooling + 1
```

The `+ 1` is the work itself, which ends up in the hot reservoir along with the
pumped heat. A COP above 1 is not a violation of anything — it is a ratio of heat
moved to work spent, not an efficiency.

## Parameters and ranges

| Quantity | Range | Default | Notes |
|---|---|---|---|
| T_hot | 400–800 K | 600 K | kept ≥ 50 K above T_cold |
| T_cold | 200–500 K | 300 K | kept ≥ 50 K below T_hot |
| Expansion ratio V₂/V₁ | 2–8 | 2 | the free parameter that closes the cycle |
| γ | 5/3 or 7/5 | 5/3 | monatomic or diatomic preset, not a free number |
| n | 1 mol | 1 mol | fixed in v1 |
| V₁ | 10 L | — | sets the absolute scale only |

The two reservoir temperatures are held at least 50 K apart. Letting them meet
would give η → 0 correctly, but would also collapse the PV diagram into a
meaningless sliver and make the T–S rectangle's height zero.

## Simplifications

- **Reversible and quasi-static throughout.** Every state on every leg is an
  equilibrium state; there is no entropy generation anywhere in the cycle.
- **No kinetic theory.** The gas is coloured by temperature as a cue, not
  simulated as particles. This sim is about the energy bookkeeping.
- **γ is a preset, not a dial.** Free numeric entry would invite γ values no real
  gas has.
- **Uniform leg duration.** Each leg takes the same wall-clock time regardless of
  how much volume or heat it moves, so that short legs stay visible and the stage
  stepper is predictable. Within a leg, the playhead moves at a constant *energy*
  rate — uniform in ln V on the isothermal legs, uniform in T on the adiabats.
- **Irreversible cycles are out of scope.** Otto, Diesel and Brayton comparisons
  are noted as future work, not modelled here.
