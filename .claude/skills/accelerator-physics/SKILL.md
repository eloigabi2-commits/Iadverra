---
name: accelerator-physics
description: "Use whenever you design or check the transverse and longitudinal motion of a charged-particle beam — a FODO lattice, a storage-ring optics cell, an RF bucket, a collider's luminosity, a synchrotron-radiation loss budget — and must pin down the invariants before trusting a number. Fixes config.units (SI | natural), picks the lattice and method (transfer matrices, Twiss propagation, phase-stability analysis), and hard-checks the candidate against Liouville (emittance conserved), the Courant–Snyder identity γβ−α²=1, positivity of β, and a tune that dodges low-order resonances. Anchored on the CERN Accelerator School / Yellow Reports, with the PDG accelerator review as backstop. The beam-optician's discipline, made checkable."
---

# Accelerator physics

Guiding a beam is an exercise in conserved quantities. The magnets set the optics, but what tells you the optics are *right* are the invariants: phase-space area (Liouville), the Twiss identity $\gamma\beta-\alpha^2=1$, positive $\beta$, and a working point off the resonance lines. This skill fixes the unit system, propagates the lattice, and turns "the beam is stable" from a hope into an audited ledger. The canonical references are the CERN Accelerator School lecture notes and the CERN Yellow Reports; the PDG accelerator-physics review is the secondary backstop.

## Method

1. **Declare the unit system, then the beam's relativistic state.** Read `config.units`. In **SI** momenta are $\mathrm{kg\,m/s}$, rigidity $B\rho=p/q$ carries teslas·metres; in **natural** ($c=1$) energy, momentum and mass share one unit. Fix $\gamma_{\rm rel}=E/mc^2$ and $\beta_{\rm rel}=v/c$ once — the *relativistic* $\beta_{\rm rel}$ is a different object from the *Twiss* $\beta$, and conflating them is a classic error. Relativistic kinematics defer to [[skills/special-and-general-relativity/SKILL|special-and-general-relativity]].
2. **Lay out the magnetic lattice — dipoles bend, quadrupoles focus.** A dipole of field $B$ bends with radius $\rho=p/(qB)$; a quadrupole of gradient $g=\partial B_y/\partial x$ has focusing strength $k=g/(B\rho)$, focusing in one plane while defocusing in the other. Alternating them (a **FODO** cell) nets focusing in both. Fields and rigidity come from [[skills/electromagnetism/SKILL|electromagnetism]].
3. **Propagate with transfer matrices; read off the betatron motion.** Each element is a $2\times2$ map on $(x,x')$ — drift $\begin{psmallmatrix}1&L\\0&1\end{psmallmatrix}$, thin quad $\begin{psmallmatrix}1&0\\-1/f&1\end{psmallmatrix}$ — composed by multiplication; leave the matrix algebra and eigen-analysis to `linear-algebra`. The single-turn map's stability requires $|\tfrac12\mathrm{Tr}\,M|<1$, and the motion is a betatron oscillation $x(s)=\sqrt{\varepsilon\beta(s)}\cos(\psi(s)+\phi_0)$.
4. **Extract the Twiss / Courant–Snyder parameters and enforce their identity.** The optics are carried by $\beta(s),\alpha=-\tfrac12\beta',\gamma=(1+\alpha^2)/\beta$, which must satisfy $\gamma\beta-\alpha^2=1$ at every $s$ (it is the determinant-1 condition in disguise) with $\beta>0$. The Courant–Snyder invariant $\gamma x^2+2\alpha x x'+\beta x'^2=\varepsilon$ is the ellipse each particle rides.
5. **Track emittance and invoke Liouville.** The phase-space area $\pi\varepsilon$ is conserved under the conservative (Hamiltonian) forces of the lattice — Liouville's theorem, cross-linked to [[skills/symmetry-and-conservation-laws/SKILL|symmetry-and-conservation-laws]]. Acceleration shrinks the geometric $\varepsilon$ as $1/(\beta_{\rm rel}\gamma_{\rm rel})$ (adiabatic damping), so the **normalized emittance** $\varepsilon_N=\beta_{\rm rel}\gamma_{\rm rel}\varepsilon$ is the true invariant — quote it, not $\varepsilon$, when energy changes.
6. **Set the tune and steer it clear of resonances.** The tune $Q=\tfrac1{2\pi}\oint ds/\beta(s)$ counts betatron oscillations per turn. Resonances $mQ_x+nQ_y=p$ (integers, order $|m|+|n|$) drive amplitude growth; keep the working point $(Q_x,Q_y)$ off the low-order lines, in particular the integer and half-integer ($Q\neq p/2$). Low order is worst.
7. **Close the longitudinal loop — RF, synchrotron motion, phase stability.** An RF cavity of voltage $V\sin\phi$ restores energy at the **synchronous phase** $\phi_s$; off-momentum particles execute slow synchrotron oscillations about it, and phase stability holds only when $\phi_s$ sits on the focusing side of the slip factor (above/below transition energy flips the stable phase). This is the bucket that keeps the bunch together.
8. **Budget luminosity and synchrotron radiation.** Collider event rate is $R=\mathcal L\sigma$ with luminosity $\mathcal L=\dfrac{f\,n_b N^2}{4\pi\sigma_x\sigma_y}$ (Gaussian beams) — smaller spots, more particles, higher rate. In a ring, radiated energy per turn $U_0\propto E^4/(m^4\rho)$: the $1/m^4$ makes it brutal for electrons and negligible for protons at the same energy, and drives the $e^+e^-$-versus-$pp$ machine choice. Feed all expressions through `dimensional-analysis`; nod to collective and beam–beam effects (space charge, wakefields, the beam–beam tune shift) as amplitude-dependent corrections on top of the linear optics.

## The rigor standard

- **The unit system is stated and the two $\beta$'s are kept distinct** — relativistic $\beta_{\rm rel}$ versus Twiss $\beta$ never share a symbol unqualified.
- **The Courant–Snyder identity $\gamma\beta-\alpha^2=1$ holds at every reported location**, with $\beta>0$ — a violation means the optics propagation is wrong, full stop.
- **Emittance conservation is exhibited** — geometric $\varepsilon$ under transport, normalized $\varepsilon_N$ under acceleration; any un-explained growth flags a non-conservative process (radiation, scattering, or an error).
- **The single-turn map is stable and the tune is off-resonance** — $|\tfrac12\mathrm{Tr}\,M|<1$ and $(Q_x,Q_y)$ clear of low-order lines are both checked, not assumed.
- **Luminosity and energy-loss formulas are dimensionally correct** and reduce to their known scalings ($\mathcal L\propto N^2$, $U_0\propto E^4/\rho$).

## Checkable output

End with a **beam-parameter ledger** the reviewer can audit against the lattice — each row ties a quantity to its method, the invariant it must respect, and its stability/limit check:

```
QUANTITY                    METHOD / LATTICE      INVARIANT CHECK               STABILITY (tune off-res)      UNITS / LIMIT
FODO cell β-function        transfer matrix       γβ−α²=1 ✓, β>0 ✓              |½TrM|<1 ✓, Q avoids n/2 ✓     m ✓
matched β* at IP            Twiss propagation     γβ−α²=1 ✓                     Q_x,Q_y off integer ✓         m ✓, β*↓ ⇒ L↑ ✓
normalized emittance ε_N    Liouville + accel.    ε_N=β_rel γ_rel ε invariant ✓ —                             mm·mrad ✓
working point (Q_x,Q_y)     tune = ∮ds/2πβ        —                            clear of |m|+|n|≤3 lines ✓     dimensionless ✓
synchronous phase φ_s       RF phase stability    —                            focusing side of slip η ✓      rad ✓
luminosity L = f n_b N²/…   Gaussian overlap      —                            —                             cm⁻²s⁻¹ ✓, ∝N² ✓
energy loss/turn U₀         synchrotron radiation —                            —                             ∝E⁴/ρ, keV ✓
```

Mandatory under **both** profiles for any claimed beam-optics result: under `pure` the ledger backs a first-principles derivation of the map and invariants (hold the proof to `mathematical-rigor`); under `applied` it is the sanity check run before quoting a $\beta$, a tune, a luminosity, or a loss budget. Compose and diagonalize the transfer matrices with `linear-algebra`, solve the betatron/synchrotron equations with `differential-equations`, and audit every homogeneity with `dimensional-analysis`.

## Anti-patterns (reject these in review)

- **Confusing relativistic $\beta_{\rm rel}$ with the Twiss $\beta$-function** — they answer different questions and carry different units; a mixed formula is silently wrong.
- **Reporting a $\beta\le0$ or an optics point where $\gamma\beta-\alpha^2\neq1$** — that is not a beam, it is a propagation bug.
- **Quoting geometric emittance across an energy change** — $\varepsilon$ shrinks with acceleration; only $\varepsilon_N$ is the invariant worth comparing between machines.
- **Parking the tune on or beside a low-order resonance** — an integer or half-integer $Q$ (or a strong sum/difference line) grows amplitudes turn by turn until the beam is lost.
- **Ignoring synchrotron radiation for light particles in a ring** — the $E^4/m^4$ scaling dominates the energy budget for electrons and is not an optional correction.
- **Treating linear optics as the whole story at high intensity** — space charge, wakefields, and the beam–beam tune shift move the working point and must be checked against the same resonance chart.
