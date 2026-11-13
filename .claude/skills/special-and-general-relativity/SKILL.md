---
name: special-and-general-relativity
description: "Use whenever a problem involves speeds near light, boosts between frames, spacetime intervals, four-vectors, or gravity as curvature — anything where 'which frame?' or 'is this invariant?' is the crux. Reasons with invariants (the interval, scalar contractions of four-vectors) instead of juggling paradoxes, states the metric signature up front, and refuses any result until the low-speed / weak-field limit reproduces Newtonian mechanics and gravity. Emits an invariant + Newtonian-limit ledger; a result whose limit is not Newtonian is wrong."
---

# Special and General Relativity

Relativity punishes frame-dependent reasoning: the paradoxes ("but in the other frame…") dissolve the
moment you compute something every observer agrees on. This skill makes the invariant the unit of
reasoning — the spacetime interval, proper time, and scalar contractions of four-vectors — and treats
frame-specific numbers (elapsed time, length, simultaneity) as derived projections. Every result is
pinned twice: it must be built from an invariant, and it must collapse to the familiar non-relativistic
answer in the appropriate limit.

## Method

1. **Fix the signature and units before writing a metric.** State the convention explicitly — this
   skill uses $(-,+,+,+)$, so $\eta_{\mu\nu}=\mathrm{diag}(-1,1,1,1)$ and $ds^2=-c^2dt^2+dx^2+dy^2+dz^2$;
   every sign below follows from it. Honor `config.units`; under `natural`, $c=1$ and intervals/energies
   share units. Defer index gymnastics (raising/lowering with $\eta$, tensor contraction) to
   `linear-algebra`, and the Minkowski/Clifford structure of the metric to
   `hypercomplex-and-geometric-algebra`.
2. **Start from the two postulates, not the transformation.** The laws of physics take the same form in
   every inertial frame, and $c$ is the same in all of them. The **Lorentz transformation** and
   $\gamma=1/\sqrt{1-v^2/c^2}$ are consequences that leave $ds^2$ invariant — derive frame effects from
   the interval rather than memorizing boost formulas.
3. **Compute the invariant interval and proper time.** $ds^2$ is frame-independent; timelike separations
   define **proper time** $d\tau=\sqrt{-ds^2}/c$, the clock reading along a worldline, which every
   observer computes to the same value. Time dilation, length contraction, and relativity of simultaneity
   are then *projections* of one invariant onto different frames — read them off $ds^2$, do not stage them
   as competing "paradoxes."
4. **Promote quantities to four-vectors and contract them.** Position $x^\mu=(ct,\mathbf x)$, four-velocity
   $u^\mu=dx^\mu/d\tau$, **four-momentum** $p^\mu=mu^\mu=(E/c,\mathbf p)$. Any scalar contraction
   $A^\mu B_\mu=\eta_{\mu\nu}A^\mu B^\nu$ is an invariant: $u^\mu u_\mu=-c^2$ and
   $p^\mu p_\mu=-(mc)^2$, which *is* the mass-shell relation $E^2=(pc)^2+(mc^2)^2$. Conservation laws and
   Lorentz/Poincaré invariance link to
   [[skills/symmetry-and-conservation-laws/SKILL|symmetry-and-conservation-laws]]; the electromagnetic
   field tensor $F^{\mu\nu}$ to [[skills/electromagnetism/SKILL|electromagnetism]].
5. **Invoke the equivalence principle to pass to gravity.** A freely falling frame is locally inertial:
   gravity is not a force but curvature of spacetime, encoded in the metric $g_{\mu\nu}$ (which reduces to
   $\eta_{\mu\nu}$ locally). Free-fall worldlines are **geodesics** — straightest paths in the curved
   metric — so the Newtonian "gravitational force" becomes geometry.
6. **Read Einstein's equation term by term.** $G_{\mu\nu}=\dfrac{8\pi G}{c^4}T_{\mu\nu}$: the left side
   $G_{\mu\nu}$ (built from the metric and its curvature) says how spacetime bends; the right side, the
   **stress–energy tensor** $T_{\mu\nu}$, says what bends it (energy, momentum, pressure density). The
   factor $8\pi G/c^4$ is fixed entirely by demanding the Newtonian limit — treat the equation as
   "curvature $=$ source," not as something to solve here.
7. **Recover Newton in the weak-field, slow-motion limit — every time.** For $v\ll c$ (equivalently
   $c\to\infty$): $\gamma\to1$, $E\to mc^2+\tfrac12mv^2$, and the geodesic equation becomes
   $\ddot{\mathbf x}=-\nabla\phi$. Write $g_{00}\approx-(1+2\phi/c^2)$; then Einstein's equation collapses
   to $\nabla^2\phi=4\pi G\rho$. Hand the systematic $c\to\infty$ expansion to
   [[skills/limiting-cases-and-asymptotics/SKILL|limiting-cases-and-asymptotics]] and the recovered
   Newtonian dynamics/gravity to [[skills/classical-mechanics/SKILL|classical-mechanics]].
8. **Check against the classic tests and close the ledger.** Perihelion precession, light deflection, and
   gravitational redshift/time dilation are the empirical anchors; e.g. redshift
   $\Delta\nu/\nu\approx gh/c^2$ falls straight out of the equivalence principle. Confirm each result is
   built from an invariant, has a Newtonian limit, and is signature/unit-consistent before reporting.

## The rigor standard

- **The signature is stated once, up front, and every sign traces to it** — results that depend on
  $(-,+,+,+)$ vs. $(+,-,-,-)$ are never reported without the convention attached.
- **Every claimed invariant is an actual scalar** — a contraction $A^\mu B_\mu$ or $ds^2$, shown equal
  across at least two frames, not a frame-specific quantity asserted to be "the same for everyone."
- **Frame effects are derived from the interval**, not staged as paradoxes; time dilation and simultaneity
  are projections of one $ds^2$, and the "twin" bookkeeping reduces to comparing proper times.
- **The Newtonian limit is exhibited, not promised** — $\gamma\to1$, $E\to mc^2+\tfrac12mv^2$,
  $\nabla^2\phi=4\pi G\rho$ — and a result that fails to reproduce it voids the derivation.

## Checkable output

End with an **invariant + Newtonian-limit ledger** the reviewer can audit line by line: each row names the
result, the frame or method used, the invariant that pins it (interval or four-vector contraction), the
$v\ll c$ / weak-field limit it must reduce to, and the units/signature. Mandatory under **both** profiles —
under `pure` it backs the first-principles derivation, under `applied` it is the sanity pass before a
number ships.

```
RESULT                 FRAME/METHOD            INVARIANT CHECK                         NEWTONIAN LIMIT (v≪c / weak field)        UNITS/SIGNATURE
relativistic energy    boost between frames    p^μ p_μ = −(mc)² frame-independent ✓    E ≈ mc² + ½mv² ✓                          sig (−,+,+,+); [E]=J
time dilation          two inertial frames     ds² invariant ⇒ dτ same for all ✓       Δt ≈ Δτ (γ→1) ✓                           natural: c=1
mass shell             any frame               E² = (pc)² + (mc²)² from p^μ p_μ ✓       KE ≈ p²/2m ✓                              [p c]=[mc²]=J
grav. redshift         equivalence principle   proper-time ratio invariant ✓           Δν/ν ≈ gh/c² ✓                            dimensionless ratio
weak-field gravity     geodesic, g₀₀≈−(1+2φ/c²) G_{μν}=8πG T_{μν}/c⁴ covariant ✓        ∇²φ = 4πGρ ✓                             sig (−,+,+,+); [φ]=J/kg
light deflection       null geodesic           ds²=0 preserved ✓                       Newtonian gravity → ½ the GR angle ✓      angle in rad
```

## Anti-patterns

- **Arguing a "paradox" frame-by-frame** — chasing whose clock is slow instead of comparing the invariant
  proper times along each worldline.
- **Reporting an interval, energy, or sign without stating the signature** — $(-,+,+,+)$ and $(+,-,-,-)$
  disagree on signs, so an unlabeled result is ambiguous.
- **Calling a frame-dependent quantity invariant** — elapsed coordinate time or contracted length is a
  projection; only scalar contractions and $ds^2$ are frame-independent.
- **Skipping the Newtonian limit** — shipping a relativistic formula without checking $\gamma\to1$ gives
  $E\to mc^2+\tfrac12mv^2$, or that weak-field gravity gives $\nabla^2\phi=4\pi G\rho$.
- **Treating gravity as a force in curved spacetime** — reintroducing $\mathbf F=-\nabla\phi$ globally
  instead of geodesic motion, valid only as the weak-field limit.
- **Mixing unit systems mid-derivation** — dropping $c$'s ad hoc instead of committing to `config.units`
  (and $c=1$ under `natural`), so $8\pi G/c^4$ factors come out wrong.
