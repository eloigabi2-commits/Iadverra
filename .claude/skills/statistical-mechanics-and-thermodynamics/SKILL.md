---
name: statistical-mechanics-and-thermodynamics
description: "Use whenever a microscopic model must be connected to macroscopic thermodynamics — or whenever a thermodynamic quantity is claimed and must be trusted. Picks the ensemble for the fixed variables, builds the partition function as the one generating object, derives energy/entropy/pressure/heat-capacity from it, and hard-checks that the micro route and the thermodynamic route agree: Maxwell relations hold, quantities are extensive, and the high-T/classical and low-T/third-law limits come out right. A number that disagrees between routes is wrong."
---

# Statistical Mechanics & Thermodynamics

Thermodynamics is the coarse shadow of a microscopic model, and the two must agree exactly where
they overlap. The bridge is the partition function: build it once, and every macroscopic quantity
falls out by differentiation. This skill makes that bridge executable and, above all, checkable —
a quantity computed two ways (from the microscopic sum and from a thermodynamic identity) that
disagrees localizes the bug immediately.

## Method

1. **Fix the variables, then pick the ensemble.** What does the environment hold constant?
   Isolated fixed $(E,V,N)$ → microcanonical; in contact with a heat bath at fixed $(T,V,N)$ →
   canonical; exchanging particles too, fixed $(T,V,\mu)$ → grand-canonical. In the
   thermodynamic limit the ensembles agree; choose the one whose fixed variables match the setup.
2. **Build the partition function — the single generating object.** Canonical
   $Z=\sum_i e^{-\beta E_i}$ with $\beta=1/k_BT$ (grand: $\mathcal Z=\sum e^{-\beta(E_i-\mu N_i)}$).
   For independent subsystems $Z$ factorizes, $\ln Z$ adds. Set $k_B=1$ under `config.units=natural`.
3. **Derive everything from $\ln Z$.** Free energy $F=-k_BT\ln Z$; then
   $\langle E\rangle=-\partial_\beta\ln Z$, $S=-\partial_T F=k_B(\ln Z+\beta\langle E\rangle)$,
   $P=-\partial_V F=k_BT\,\partial_V\ln Z$, $C_V=\partial_T\langle E\rangle$. Do not re-postulate
   what $Z$ already contains — read it off.
4. **Cross-check micro against macro.** Compute the target both ways and demand agreement:
   $\langle E\rangle$ from $-\partial_\beta\ln Z$ versus from $F+TS$; a Maxwell relation (e.g.
   $(\partial S/\partial V)_T=(\partial P/\partial T)_V$, an equality of mixed second derivatives
   of $F$) must hold identically. A mismatch is a defect, not roundoff.
5. **Count entropy two ways and reconcile.** Boltzmann $S=k_B\ln\Omega$ (microcanonical) and Gibbs
   $S=-k_B\sum_i p_i\ln p_i$ (canonical, $p_i=e^{-\beta E_i}/Z$) must give the same $S$ in the
   thermodynamic limit. The first, second, and third laws are the standing constraints: $dU=TdS-PdV+\mu dN$,
   $dS_{\rm univ}\ge0$, and $S\to$ const (0 for a nondegenerate ground state) as $T\to0$.
6. **Apply equipartition — and know where it breaks.** Each quadratic degree of freedom contributes
   $\tfrac12k_BT$ to $\langle E\rangle$ only in the classical regime $k_BT\gg$ level spacing. When
   $k_BT\ll\Delta$ the mode freezes out ($C_V\to0$): vibrational/rotational modes deactivate,
   defer the quantized levels to [[skills/quantum-mechanics/SKILL|quantum-mechanics]].
7. **Use the right statistics; recover the classical limit.** Indistinguishable quanta obey
   Bose–Einstein $\bar n=1/(e^{\beta(\epsilon-\mu)}-1)$ or Fermi–Dirac $\bar n=1/(e^{\beta(\epsilon-\mu)}+1)$;
   both → Maxwell–Boltzmann $\bar n=e^{-\beta(\epsilon-\mu)}$ when $e^{\beta(\epsilon-\mu)}\gg1$
   (dilute / high-$T$, occupancy $\ll1$). Take distributions and their moments from
   `probability-and-statistics`; do not re-derive them here.
8. **At a phase transition, name the order parameter and the broken symmetry.** A nonanalyticity
   in $F$ (thermodynamic limit only) signals a transition; identify the order parameter, which
   symmetry the ordered state breaks, and the critical behavior — tie the broken symmetry to
   [[skills/symmetry-and-conservation-laws/SKILL|symmetry-and-conservation-laws]].

## The rigor standard

- **Every macroscopic quantity is derived from $\ln Z$, not asserted** — "$P=Nk_BT/V$" is
  incomplete until it is shown to be $k_BT\,\partial_V\ln Z$.
- **At least one Maxwell relation is checked** as an identity of mixed second derivatives of the
  chosen potential, not assumed.
- **Extensivity is verified**: $F,S,U,N$ scale linearly under $(V,N)\to(\lambda V,\lambda N)$;
  intensive $T,P,\mu$ do not. A non-extensive entropy signals a missing $1/N!$ or a bad limit.
- **Both temperature limits are taken**: high-$T$/classical (equipartition, Dulong–Petit) and
  low-$T$/third-law ($S\to0$, $C_V\to0$) — cross-checked via
  [[skills/limiting-cases-and-asymptotics/SKILL|limiting-cases-and-asymptotics]].
- **The thermodynamic limit is stated** wherever a sharp transition or ensemble equivalence is used.

## Checkable output

Report a **micro↔macro consistency ledger**: for each quantity, its ensemble, the value from $Z$,
and an independent thermodynamic cross-check (a Maxwell relation, a limit, or extensivity). Mandatory
under **both** profiles — under `pure` it backs the first-principles derivation, under `applied` it is
the sanity pass run before any number ships.

```
QUANTITY               ENSEMBLE/METHOD   FROM Z                          THERMO CROSS-CHECK                          ✓
ideal-gas P            canonical         P = k_BT ∂_V ln Z = Nk_BT/V     matches PV = Nk_BT; extensive in N          ✓
ideal-gas S            canonical         Sackur–Tetrode from ln Z        extensive (needs 1/N!); (∂S/∂V)_T=Nk_B/V    ✓
⟨E⟩ two routes         canonical         −∂_β ln Z                       equals F + TS                               ✓
Einstein solid C_V     canonical         from ln Z of N oscillators      → 3Nk_B high-T (Dulong–Petit); → 0 low-T   ✓
Maxwell relation       —                 F(T,V)                          (∂S/∂V)_T = (∂P/∂T)_V holds identically     ✓
Fermi gas at T→0       grand-canonical   ⟨n⟩ → step at μ=E_F             S → 0 (third law); C_V ∝ T                  ✓
BE occupancy, high-T   grand-canonical   1/(e^{β(ε−μ)}−1)                → Maxwell–Boltzmann e^{−β(ε−μ)}             ✓
2-level system C_V     canonical         Schottky peak from ln Z         → 0 both T→0 and T→∞; ∫C_V/T dT = ΔS        ✓
```

Ship only when every quantity that can be reached two ways agrees on both, no Maxwell row is left
unchecked, and every extensive quantity scales correctly. The $\partial_\beta\ln Z$ derivatives and
mixed-partial Maxwell checks run through the configured CAS (`config.cas`: sympy|sage|none); route
the unit-consistency pass on every entry to `dimensional-analysis`.

## Anti-patterns

- **Asserting a thermodynamic result without routing it through $Z$** — quoting $C_V=\tfrac32Nk_B$
  without showing it survives (or fails) the low-$T$ quantum limit.
- **Applying equipartition where the mode is frozen** — giving a diatomic gas its full vibrational
  $k_BT$ at room temperature when $k_BT\ll\hbar\omega_{\rm vib}$.
- **Non-extensive entropy** — dropping the $1/N!$ Gibbs factor and then puzzling over the mixing
  paradox, or reading an $S$ that fails to double when the system doubles.
- **Using classical Maxwell–Boltzmann counting where quantum degeneracy dominates** — treating a
  cold Fermi or Bose gas as a classical ideal gas.
- **Claiming a sharp phase transition at finite $N$** — nonanalyticity of $F$ exists only in the
  thermodynamic limit; a finite system has a smooth crossover.
- **Conflating Boltzmann and Gibbs entropy off-equilibrium, or skipping the Maxwell-relation check**
  because "the algebra looked right" — the cross-check outranks the algebra.
