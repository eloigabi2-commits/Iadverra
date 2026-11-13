---
name: relativistic-kinematics-and-collisions
description: "Use whenever a problem involves collisions, decays, or scattering of relativistic particles — anything where four-momentum bookkeeping, 'what is the CM energy?', 'is this above threshold?', or 'is the answer the same in the lab frame?' is the crux. Reasons with Lorentz invariants (invariant mass, Mandelstam s,t,u) that make every answer frame-independent, checks the process clears threshold before computing rates, and refuses a result until four-momentum conservation, the invariant mass, and units all reconcile across frames. Emits a kinematics ledger keyed to the PDG Kinematics review; a number that changes under a boost is wrong."
---

# Relativistic Kinematics and Collisions

Particle kinematics punishes frame-dependent reasoning exactly as relativity does: energies and momenta
are shuffled by every boost, but the physics — what can decay into what, what threshold a beam must clear,
where a resonance sits — lives in the Lorentz invariants. This skill makes the invariant the unit of
reasoning: four-momentum conservation $\sum p_i^\mu=\sum p_f^\mu$, the invariant mass $M^2=(\sum p)^2$, and
the Mandelstam variables $s,t,u$. Lab-frame and CM-frame numbers are derived projections; the conserved,
frame-independent quantities are what get computed and checked. The PDG *Review of Particle Physics*
(Kinematics and Cross-section reviews) and the CERN Yellow Reports are the standard references for the
conventions and formulae below.

## Method

1. **Fix the metric, units, and the mass-shell condition first.** State the signature (this skill uses
   $(+,-,-,-)$, so $p^2=p^\mu p_\mu=E^2-|\mathbf p|^2$) and honor `config.units`: HEP defaults to natural
   units ($\hbar=c=1$), where energies, momenta, and masses all carry eV/GeV and $p^2=m^2$ on shell.
   Restore SI by dimensional analysis — reinsert $c$ so $[E]=[pc]=[mc^2]$ — and hand the systematic
   bookkeeping to `dimensional-analysis`. Every particle sits on its mass shell: $E_i^2=|\mathbf p_i|^2+m_i^2$.
2. **Write four-momentum conservation once, for the whole process.** $\sum p_i^\mu=\sum p_f^\mu$ holds
   component by component in *any* frame — it is the master equation for both decays and collisions. Defer
   the general boost/contraction machinery to
   [[skills/special-and-general-relativity/SKILL|special-and-general-relativity]] and the underlying
   Poincaré/Noether origin of the conservation law to
   [[skills/symmetry-and-conservation-laws/SKILL|symmetry-and-conservation-laws]]; here the four-vector
   sum *is* the constraint that every subsequent invariant is built from.
3. **Form the invariant mass and prove it is frame-independent.** For any set of momenta,
   $M^2=(\sum p)^2=(\sum E)^2-|\sum\mathbf p|^2$ is a scalar contraction — the same number in the lab, the
   CM, or any boosted frame. A reconstructed resonance mass, a decaying particle's rest mass, and the
   total collision energy are all instances of one invariant; compute it as a contraction, never as a
   frame-specific energy. This is the quantity every observer agrees on, so it is the quantity worth
   reporting.
4. **Reduce two-body scattering to the Mandelstam variables and check the identity.** For $1+2\to3+4$,
   $s=(p_1+p_2)^2$, $t=(p_1-p_3)^2$, $u=(p_1-p_4)^2$ are the three independent invariants, and they satisfy
   $s+t+u=\sum_{i=1}^4 m_i^2$ — an exact identity that follows from conservation plus the mass shells and
   is the cheapest available consistency check. $s$ is the squared CM energy, $t$ and $u$ the squared
   momentum transfers; a scattering amplitude expressed in $s,t,u$ is manifestly frame-independent.
5. **Distinguish CM from lab and boost between them.** $\sqrt s$ is the total energy in the
   center-of-momentum frame ($\sum\mathbf p=0$). For a **collider** with two beams of energy $E$ meeting
   head-on, $\sqrt s\approx 2E$; for a **fixed-target** experiment (beam energy $E$, target mass $m$ at
   rest), $\sqrt s=\sqrt{m_{\text{beam}}^2+m^2+2Em}\sim\sqrt{2Em}$ at high energy — the square-root scaling
   is why colliders reach far higher $\sqrt s$ than fixed-target beams of the same energy. Get from one
   frame to the other by the Lorentz boost of the four-momenta, and confirm the invariant mass is
   unchanged.
6. **Test threshold before computing any rate.** A final state is kinematically accessible only if
   $\sqrt s\ge\sum m_{\text{final}}$; at threshold the products are produced at rest in the CM. For a
   **two-body decay** $M\to m_1+m_2$ in the parent rest frame the daughter momentum is fixed,
   $p^*=\dfrac{1}{2M}\sqrt{[M^2-(m_1+m_2)^2][M^2-(m_1-m_2)^2]}$, and requiring $p^*$ real *is* the
   threshold condition $M\ge m_1+m_2$. No cross-section or branching fraction is meaningful below
   threshold — check this gate first.
7. **Build rates on Lorentz-invariant phase space.** Decay rates and cross-sections follow the Fermi
   golden-rule structure — rate $\propto |\mathcal M|^2\times(\text{phase space})$ — with the
   Lorentz-invariant phase space $d\Pi=\prod_f\dfrac{d^3p_f}{(2\pi)^3\,2E_f}\,(2\pi)^4\delta^4(\sum p_i-\sum p_f)$.
   The $\delta^4$ enforces four-momentum conservation and the $1/2E_f$ factors keep the measure invariant.
   Take $|\mathcal M|^2$ from the dynamics ([[skills/particle-physics-and-the-standard-model/SKILL|particle-physics-and-the-standard-model]]);
   this skill supplies the kinematic skeleton and the invariants it must respect.
8. **Report collider observables in variables with clean boost behavior.** Longitudinal boosts along the
   beam shift **rapidity** $y=\tfrac12\ln\frac{E+p_z}{E-p_z}$ by an additive constant, so rapidity
   *differences* are boost-invariant; **pseudorapidity** $\eta=-\ln\tan(\theta/2)$ is the massless limit of
   $y$. **Transverse momentum** $p_T$ is invariant under longitudinal boosts, which is why $p_T$, $\Delta y$,
   and invariant mass are the workhorse observables. Close the ledger only once conservation, invariant
   mass, the $s+t+u$ identity, threshold, and units all check.

## The rigor standard

- **Four-momentum conservation is written as a four-vector equation and verified component-wise** — energy
  *and* all three momentum components balance, in one stated frame, before any invariant is extracted.
- **Every quantity called invariant is an actual scalar contraction** — $M^2=(\sum p)^2$ or a Mandelstam
  variable, shown equal in at least two frames (typically lab and CM), never a frame-specific energy
  asserted to be universal.
- **The $s+t+u=\sum_i m_i^2$ identity is exhibited, not assumed** — it is the free consistency check on any
  two-body scattering kinematics, and a violation means an error upstream.
- **Threshold is checked before rates** — $\sqrt s\ge\sum m_{\text{final}}$ (equivalently $p^*$ real for a
  two-body decay); a cross-section quoted for an inaccessible final state is void.
- **Units are consistent and the natural-units restoration is honest** — factors of $\hbar,c$ reinstated by
  dimensional analysis so that $[\,\sqrt s\,]=[m]=\text{GeV}$ (or SI energy) throughout.

## Checkable output

End with a **kinematics ledger** the reviewer can audit line by line: each row names the quantity, the
frame or method used, the invariant check that pins it ($p\!\cdot\!p$ frame-independence, the
$s+t+u=\sum m^2$ identity), the threshold or conservation condition it must satisfy, and the units. It is
**mandatory under both profiles** — under `pure` it backs the invariant-first derivation, under `applied`
it is the sanity pass before a number (a $\sqrt s$, a threshold beam energy, a reconstructed mass) ships.

```
QUANTITY               FRAME/METHOD          INVARIANT CHECK (p·p, s+t+u=Σm²)          THRESHOLD/CONSERVATION            UNITS
e⁺e⁻ → Z               CM                    s=(p₁+p₂)² frame-indep ✓                  √s = m_Z at resonance ✓          GeV ✓
fixed-target √s        lab → CM boost        invariant mass matches across frames ✓    —                                √s ∼ √(2Em) ✓
p+p → p+p+π⁰           lab, threshold        s+t+u = Σmᵢ² holds ✓                       √s ≥ 2m_p+m_π (above) ✓          GeV ✓
D⁰ → K⁻π⁺              parent rest frame     M² = (p_K+p_π)² reconstructs m_D ✓         p* real ⇒ M ≥ m_K+m_π ✓          GeV ✓
Compton γe → γe        any frame             s+t+u = 2m_e² (m_γ=0) ✓                    Σp^μ conserved 4-vector ✓        natural, ħ=c=1 ✓
jet pair               boosted along beam    Δy, p_T boost-invariant ✓                  E,p_z balance ✓                  GeV, y dimensionless ✓
```

## Anti-patterns

- **Reporting a frame-dependent energy as if it were the answer** — quoting a lab-frame energy or momentum
  where the invariant mass or $\sqrt s$ is what every observer agrees on, so the "result" changes under a
  boost.
- **Skipping the threshold check** — computing a cross-section or branching fraction for a final state with
  $\sum m_{\text{final}}>\sqrt s$, i.e. below threshold, where the rate is identically zero.
- **Confusing collider and fixed-target $\sqrt s$ scaling** — using $\sqrt s\approx 2E$ for a fixed target
  (it grows only as $\sqrt{2Em}$), or vice versa, and overstating the reach of a beam.
- **Never checking $s+t+u=\sum_i m_i^2$** — leaving the cheapest consistency test on the table and shipping
  two-body kinematics with an undetected algebra error.
- **Treating rapidity or $\eta$ as boost-invariant** — only rapidity *differences* and $p_T$ survive a
  longitudinal boost; $y$ and $\eta$ themselves shift.
- **Dropping $\hbar,c$ ad hoc instead of by dimensional analysis** — leaving natural units without a clean
  restoration, so a threshold energy or lifetime comes out with the wrong powers of $c$.
