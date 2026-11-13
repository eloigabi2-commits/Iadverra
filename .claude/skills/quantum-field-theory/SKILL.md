---
name: quantum-field-theory
description: "Use whenever a problem involves relativistic quanta, fields with a Lagrangian density, Feynman diagrams, scattering amplitudes, cross-sections or decay rates, loop divergences, running couplings, or gauge invariance — anything where 'quantum mechanics + special relativity' is the frame and an amplitude must survive symmetry, dimension, and renormalization checks. Computes amplitudes $\\mathcal M$ from Lagrangians and Feynman rules, tracks mass dimensions and symmetry factors, and refuses any result until the Ward identity holds, divergences are absorbed, and the tree-level / non-relativistic limit is recovered. Emits an amplitude & renormalization ledger; an amplitude that violates gauge independence or a mass-dimension count is wrong. Breadth and method follow the Review of Particle Physics and CERN Yellow Reports."
---

# Quantum Field Theory

Quantum field theory is what you get when quantum mechanics is forced to obey special relativity: particles
become excitations of fields, particle number stops being conserved, and every observable is an amplitude
summed over histories. This skill treats the field's **Lagrangian density** $\mathcal L$ as the starting
datum and the scattering amplitude $\mathcal M$ as the deliverable — but a raw amplitude is worthless until
it passes the exact checks that QFT hands you for free: mass-dimension bookkeeping, diagram symmetry
factors, gauge/Ward identities, cancellation of divergences, and reduction to known limits. Every result is
pinned by those checks before it ships. Coverage and method here track the *Review of Particle Physics* and
the CERN Yellow Reports / European School of HEP as breadth-and-method maps, not as sources to quote.

## Method

1. **Write the Lagrangian density and fix the action.** Physics lives in $\mathcal L$; the dynamics come from
   the action $S=\int d^4x\,\mathcal L$ made stationary. Use the standard building blocks: a real scalar
   $\mathcal L=\tfrac12(\partial\phi)^2-\tfrac12 m^2\phi^2-V(\phi)$, a Dirac fermion
   $\mathcal L=\bar\psi(i\gamma^\mu\partial_\mu-m)\psi$, a gauge field
   $\mathcal L=-\tfrac14 F_{\mu\nu}F^{\mu\nu}$. State `config.units` first: HEP works in natural units
   $\hbar=c=1$, so masses, momenta, and energies share one unit and SI is restored later by dimensional
   analysis. Fix the metric signature exactly as in
   [[skills/special-and-general-relativity/SKILL|special-and-general-relativity]].
2. **Count mass dimensions before anything else.** In $d=4$ natural units $[S]=0$ so $[\mathcal L]=4$; with
   $[\partial]=1$ this forces $[\phi]=1$ (scalar), $[\psi]=3/2$ (fermion), $[A_\mu]=1$. Every coupling's
   dimension is then read off its interaction term and is a renormalizability flag: $[g]\ge0$ is
   renormalizable (marginal or relevant), $[g]<0$ (e.g. a dimension-5 operator, $[g]=-1$) is non-renormalizable
   and signals an effective theory with a cutoff. Hand the systematic dimension algebra to the math-pack
   `dimensional-analysis` skill.
3. **Quantize by one of the two routes.** **Canonical quantization** promotes fields to operators with
   $[\phi(\mathbf x),\pi(\mathbf y)]=i\delta^3(\mathbf x-\mathbf y)$ and expands in creation/annihilation
   modes — physical when you want a particle interpretation and a Hilbert space. The **path integral**
   $\langle\text{out}|\text{in}\rangle=\int\mathcal D\phi\,e^{iS/\hbar}$ sums over field configurations —
   physical when you want manifest symmetry, gauge fixing, and generating functionals. They agree; pick by
   convenience. The linear-algebra of mode operators links to `linear-algebra`; overlaps with
   [[skills/quantum-mechanics/SKILL|quantum-mechanics]] (this is its relativistic completion).
4. **Get the propagator as the Green's function of the free operator.** The free two-point function is the
   inverse of the quadratic differential operator: the scalar Feynman propagator is
   $\tilde D_F(p)=i/(p^2-m^2+i\epsilon)$, the fermion $\ i(\slashed p+m)/(p^2-m^2+i\epsilon)$. The $i\epsilon$
   fixes causal (time-ordered) boundary conditions; the pole location is the physical mass. Contour
   deformation and pole structure are `complex-analysis` (Cauchy, residues, analytic continuation).
5. **Expand perturbatively and draw Feynman diagrams with correct symmetry factors.** Split
   $\mathcal L=\mathcal L_0+\mathcal L_{\rm int}$ and expand in the coupling. Each term maps to a diagram:
   propagators for internal lines, vertices from $\mathcal L_{\rm int}$, external legs amputated (LSZ, at
   the conceptual level, converts time-ordered correlators into $S$-matrix elements). Impose momentum
   conservation at every vertex and integrate over each undetermined loop momentum $\int d^4k/(2\pi)^4$.
   **Compute the symmetry factor** $1/S$ from the diagram's automorphisms (e.g. $S=2$ for the one-loop
   scalar "sunset"/tadpole with a self-contracted vertex) — a miscounted $S$ is the most common silent error.
6. **Assemble $\mathcal M$ and turn it into an observable.** The amplitude $\mathcal M$ feeds physical rates:
   a $2\to2$ cross-section $d\sigma/d\Omega=|\mathcal M|^2/(64\pi^2 s)$ in the CM frame (massless limit), a
   decay rate $\Gamma=|\mathcal M|^2\,p^*/(8\pi m^2)$ for $1\to2$. Spin sums/averages use completeness
   relations; kinematics (Mandelstam $s,t,u$ with $s+t+u=\sum m_i^2$) come from
   [[skills/symmetry-and-conservation-laws/SKILL|symmetry-and-conservation-laws]]. Cross-sections must be
   positive and Lorentz-invariant.
7. **Regulate divergences, renormalize, and run the coupling.** Loop integrals often diverge in the UV;
   **regularize** (dimensional regularization $d=4-\epsilon$ preserves gauge symmetry, isolating a $1/\epsilon$
   pole), then **renormalize** by absorbing the poles into a finite set of counterterms so measured
   quantities come out finite. The price is a scale $\mu$: couplings **run**, governed by the
   $\beta$-function $\beta(g)=\mu\,dg/d\mu$ (e.g. QED $\beta(e)>0$, coupling grows with energy; QCD
   $\beta(g)<0$, asymptotic freedom). A renormalizable theory absorbs *all* divergences into finitely many
   parameters — verify that it does.
8. **Enforce gauge invariance and symmetry as exact checks, then take the limits.** **Gauge invariance**
   constrains the theory: the **Ward–Takahashi identity** $q_\mu\mathcal M^\mu=0$ (current conservation) is
   an exact statement that must hold order by order, and every physical observable must be **gauge-independent**
   (independent of the gauge-fixing parameter $\xi$). Track internal and Lorentz symmetries; **spontaneous
   symmetry breaking** of a continuous symmetry yields massless **Goldstone bosons**, which in a gauge theory
   are eaten to give the gauge boson mass — the **Higgs mechanism**. Close by checking limits: the tree-level
   / classical limit, the non-relativistic limit (recover the Schrödinger/Coulomb result), and high-energy
   scaling. Downstream phenomenology is `particle-physics-and-the-standard-model`.

## The rigor standard

- **Mass dimensions balance in every term.** $[\mathcal L]=4$ in $d=4$ natural units; each field and coupling
  dimension is exhibited, and a coupling with $[g]<0$ is flagged as non-renormalizable — not quietly used as
  if it were fundamental.
- **Every diagram carries its symmetry factor and every loop its measure.** $1/S$ is computed from the
  diagram's automorphisms, not guessed; loop momenta are integrated with $\int d^4k/(2\pi)^4$ and the
  $i\epsilon$ prescription is stated.
- **The Ward identity and gauge independence are shown, not assumed.** $q_\mu\mathcal M^\mu=0$ holds at the
  claimed order, and any physical result is checked to be independent of the gauge parameter $\xi$ — a
  $\xi$-dependent cross-section is a bug.
- **Divergences are regularized and absorbed, with the scheme named.** A finite answer states its regulator
  (e.g. dim reg, $d=4-\epsilon$) and renormalization scheme; the $\mu$-dependence is carried by the running
  coupling via $\beta(g)$, and the theory's renormalizability is asserted only after the divergences close.
- **Limits are exhibited.** Tree-level, non-relativistic, and high-energy behaviors are reproduced; a
  formula that does not reduce to the known limit voids the derivation.

## Checkable output

End with an **amplitude & renormalization ledger** the reviewer can audit line by line: each row names the
process or quantity, the order/method (tree, one-loop, dim reg), the dimension & symmetry-factor check, the
Ward/gauge check, the divergence/renormalization status, and the limit it must reproduce. Mandatory under
**both** profiles for any amplitude or loop claim — under `pure` it backs the first-principles derivation,
under `applied` it is the sanity pass before a number ships.

```
QUANTITY                 ORDER/METHOD      DIMENSION & SYMMETRY-FACTOR       WARD/GAUGE                    DIVERGENCE/RENORM              LIMIT
e⁺e⁻ → μ⁺μ⁻ (σ)          tree              [M] balances ✓, no sym. factor    current conserved q·M=0 ✓    finite ✓                       high-s: σ ~ 1/s ✓
Compton γe → γe          tree              [M] ✓, two diagrams s+t           gauge-indep. (ξ drops) ✓     finite ✓                       Thomson σ_T (ω→0) ✓
scalar self-energy       one-loop          [Π]=2 ✓, S=2 (tadpole)            n/a (no gauge current)       Λ² div → mass counterterm ✓    on-shell: m_phys ✓
QED vertex correction    one-loop, dim reg [Γ^μ]=1 ✓, S=1                    Ward Z₁=Z₂ ✓                 1/ε pole → Z₁, finite g−2 ✓    NR: Coulomb + a_e ✓
running coupling α(μ)     β-function        dimensionless ✓                   —                            μ-dep. absorbed, β(e)>0 ✓      low-μ: α ≈ 1/137 ✓
Higgs mass term          tree, SSB         [gauge boson m]=1 ✓               Goldstone eaten, U(1) ✓      renormalizable ✓               unbroken: m→0 ✓
```

## Anti-patterns

- **Shipping an amplitude without the dimension count** — not checking $[\mathcal L]=4$ and each coupling's
  mass dimension, so a non-renormalizable operator gets treated as fundamental instead of as effective-theory
  with a cutoff.
- **Miscounting or omitting the symmetry factor** — reading vertices and propagators off the diagram but
  guessing $1/S$, which silently rescales every loop result.
- **Asserting the Ward identity instead of verifying it** — claiming gauge invariance while a longitudinal
  photon fails to decouple ($q_\mu\mathcal M^\mu\ne0$), or reporting a cross-section that still depends on the
  gauge-fixing parameter $\xi$.
- **Renormalizing without naming the regulator or scheme** — a "finite" answer with no stated regularization
  (dim reg, cutoff) and no counterterm bookkeeping, so the $\mu$-dependence and the $\beta$-function are lost.
- **Confusing regularization with renormalization** — treating the cutoff as physics rather than absorbing the
  divergence into measured parameters, or dropping the $i\epsilon$ that fixes the propagator's causal pole.
- **Skipping the limit** — never checking that the amplitude reproduces the tree-level, non-relativistic
  (Coulomb/Schrödinger), or high-energy scaling result, so an error in $\mathcal M$ goes undetected.
