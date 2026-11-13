---
name: limiting-cases-and-asymptotics
description: "Use whenever a derived physical result must be trusted — a new formula, a corrected old one, a reviewer's number — before it ships. Names the small/large dimensionless parameter, takes each canonical limit explicitly, and confirms the result reduces to the already-known case (Newtonian, classical, weak-field, high/low-T, weak/strong coupling). Emits a limit-check ledger; a result that fails its limit is wrong."
---

# Limiting Cases & Asymptotics

The single most reliable correctness check in physics: every result must collapse to the
already-established result in the appropriate limit, and an asymptotic expansion exposes a
formula's *structure* before any number is computed. This turns "looks right" into a
verification a reviewer can rerun.

## Method

1. **Identify the dimensionless parameter.** A limit is only meaningful in a *dimensionless*
   ratio — $\beta=v/c$, $\hbar\omega/kT$, coupling $g$, $r_s/r$, $1/N$. Find the small (or
   large) one; expanding in a dimensioned quantity is meaningless (defer to `dimensional-analysis`).
2. **Take the limit explicitly, Taylor-expand.** Write the result as a series in the small
   parameter $\epsilon$: $f(\epsilon)=f_0+f_1\epsilon+f_2\epsilon^2+\dots$ The leading term
   $f_0$ must be the known result; the next term is your leading correction, and its sign and
   size are themselves checkable.
3. **Confirm the canonical recoveries.** Non-relativistic $v\ll c$ (or $c\to\infty$) → Newtonian
   mechanics; classical $\hbar\to0$ or large quantum number $n$ → correspondence principle
   (Ehrenfest: $\langle\text{operators}\rangle$ obey classical equations); weak-field / linearized
   gravity → Newtonian gravity; thermodynamic $N\to\infty$; high- and low-$T$; weak/strong coupling.
4. **Dominant balance.** In an equation with several terms, ask which survive as $\epsilon\to0$.
   The balance that holds (e.g. inertia vs. drag, kinetic vs. potential) fixes the regime and the
   leading behavior; discarded terms define the correction. Respect `config.units` — under `natural`,
   $\hbar=c=1$ and the limits are taken in the surviving ratios.
5. **Match asymptotics when a naive expansion is singular.** If setting $\epsilon=0$ drops the
   highest derivative or blows a term up, the expansion is singular: solve an inner (boundary-layer)
   and outer solution separately and match them in the overlap. A uniformly-naive Taylor series
   there is wrong.
6. **Use symmetry limits as free extra checks.** Equal masses, identical particles, coincident
   charges, or a vanishing asymmetry must leave the result invariant or symmetric. A formula that
   isn't symmetric where the setup is has a bug.
7. **Cross-check the number.** Confirm the leading term numerically against the known case to
   `config.sig_figs`, and sanity-check the correction's magnitude against an order-of-magnitude
   estimate (see [[skills/order-of-magnitude-estimation/SKILL|order-of-magnitude-estimation]]).

## The rigor standard

- **Every derived formula has at least one explicit limit check** — the parameter named, the
  limit taken, the known result recovered. This holds under both `pure` and `applied`.
- **Both ends of a two-sided crossover are checked** (e.g. a spectrum at high *and* low
  $h\nu/kT$), not just the convenient one.
- **The leading correction is reported, not just the leading term** — its sign and scaling are
  part of the check.
- **A singular limit is flagged as singular** and handled by matching, never by a naive series.
- **A failed limit voids the result**; it is corrected or withdrawn, not excused.

## Checkable output

End with a **limit-check ledger** the reviewer can rerun line by line:

```
RESULT                          LIMIT (parameter → value)   REDUCES TO (known result)        VERDICT
relativistic KE (γ−1)mc²        v/c → 0                     ½mv²                             ✓
Planck spectrum                 hν/kT ≪ 1                   Rayleigh–Jeans (2ν²kT/c²)        ✓
  "                             hν/kT ≫ 1                   Wien (∝ ν³e^{−hν/kT})            ✓
⟨x²⟩ QHO, level n               ħ → 0, n large              classical turning-point density  ✓
weak-field metric g₀₀           GM/rc² ≪ 1                  Newtonian −(1+2Φ/c²)             ✓
two-body force, m₁=m₂           mass asymmetry → 0          symmetric under 1↔2               ✓
```

Ship only when every derived formula has a passing row and no row is left unresolved. Under
`applied` this ledger is mandatory alongside `dimensional-analysis`; under `pure` it backs the
argument built with `mathematical-rigor`. See also
[[skills/model-building-and-approximation/SKILL|model-building-and-approximation]] for choosing
the regime, [[skills/special-and-general-relativity/SKILL|special-and-general-relativity]] and
[[skills/quantum-mechanics/SKILL|quantum-mechanics]] for the relativistic and classical limits;
expand series with the configured CAS (`config.cas`: sympy|sage|none).

## Anti-patterns

- Expanding in a **dimensioned** quantity instead of a dimensionless ratio — the "small" is undefined.
- Checking one side of a crossover and assuming the other (Rayleigh–Jeans verified, Wien skipped).
- Applying a **naive** Taylor series across a singular limit (dropped highest derivative, boundary layer).
- Keeping only $f_0$ and never inspecting the leading correction $f_1\epsilon$ — half the information wasted.
- Confusing $\hbar\to0$ with $n\to\infty$: both approach classicality but through different limits; state which.
- Declaring a limit "passes" from the formula's shape without substituting and reducing to the named case.
