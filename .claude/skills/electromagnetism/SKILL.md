---
name: electromagnetism
description: "Use whenever you solve a field problem from Maxwell's equations — electrostatic potential, magnetostatic field, a wave in vacuum or media, or radiation — and must pin down the boundary conditions, gauge, and unit system before trusting a result. Fixes config.units (SI | gaussian | natural) so the 4π and c factors are explicit, picks the method (images, separation, multipole, vector potential), and hard-checks the candidate against Maxwell, every interface condition, and the static/far-field limit. The field-solver's discipline, made checkable."
---

# Electromagnetism

Every electromagnetic result is only as trustworthy as the three things usually left implicit: the **unit system** (formulas differ by factors of $4\pi$ and $c$ between conventions), the **boundary conditions** at every interface, and the **gauge** chosen for the potentials. This skill makes those explicit up front and turns "the fields solve Maxwell" from a claim into an audited ledger.

## Method

1. **Declare the unit system first — it sets every constant.** Read `config.units`. In **SI**, Gauss reads $\nabla\!\cdot\!\mathbf E=\rho/\epsilon_0$ and Ampère–Maxwell $\nabla\times\mathbf B=\mu_0\mathbf J+\mu_0\epsilon_0\,\partial_t\mathbf E$; in **Gaussian**, $\nabla\!\cdot\!\mathbf E=4\pi\rho$ and $\nabla\times\mathbf B=\tfrac{4\pi}{c}\mathbf J+\tfrac1c\partial_t\mathbf E$; in **natural** ($\epsilon_0=\mu_0=c=1$) the constants collapse. Never mix conventions mid-derivation; state the choice in the answer.
2. **Write all four Maxwell equations, differential and integral.** Gauss, Gauss-for-magnetism ($\nabla\!\cdot\!\mathbf B=0$), Faraday ($\nabla\times\mathbf E=-\partial_t\mathbf B$, SI), Ampère–Maxwell. Pair each with its integral form (flux/circulation) — the integral form is what you evaluate on a symmetric Gaussian/Amperian surface. Homogeneity of every term is the province of `dimensional-analysis`; defer the units audit there.
3. **Impose the interface boundary conditions — the usual failure point.** Across any surface: $B_\perp$ and $E_\parallel$ are **continuous**; $D_\perp$ jumps by free surface charge ($\hat n\!\cdot\!(\mathbf D_2-\mathbf D_1)=\sigma_f$) and $H_\parallel$ jumps by free surface current ($\hat n\times(\mathbf H_2-\mathbf H_1)=\mathbf K_f$). Conductors in statics: $\mathbf E=0$ inside, surface is an equipotential.
4. **Electrostatics: reduce to Poisson/Laplace, then invoke uniqueness.** $\mathbf E=-\nabla\phi$ gives $\nabla^2\phi=-\rho/\epsilon_0$ (SI; $-4\pi\rho$ Gaussian), Laplace $\nabla^2\phi=0$ in charge-free regions. The **uniqueness theorem** licenses any trick that reproduces the sources and boundary values — **method of images** (replace a conductor by fictitious charges), **separation of variables** (expand in the geometry's harmonics), or the **multipole expansion** $\phi=\frac1{4\pi\epsilon_0}\sum_\ell \frac{q_\ell}{r^{\ell+1}}$ far away.
5. **Magnetostatics: Ampère's law by symmetry, or the vector potential.** With enough symmetry, $\oint\mathbf B\!\cdot\!d\boldsymbol\ell=\mu_0 I_{\rm enc}$ delivers $\mathbf B$ directly. Otherwise use $\mathbf B=\nabla\times\mathbf A$ (which makes $\nabla\!\cdot\!\mathbf B=0$ automatic) and solve $\nabla^2\mathbf A=-\mu_0\mathbf J$ in Coulomb gauge.
6. **Fix the gauge, and remember observables don't depend on it.** $\mathbf E,\mathbf B$ are invariant under $\mathbf A\to\mathbf A+\nabla\chi,\ \phi\to\phi-\partial_t\chi$. Choose **Coulomb** ($\nabla\!\cdot\!\mathbf A=0$, clean for statics) or **Lorenz** ($\nabla\!\cdot\!\mathbf A+\tfrac1{c^2}\partial_t\phi=0$, which decouples the potentials into wave equations). Any physical result carrying a residual gauge parameter is a bug — see [[skills/symmetry-and-conservation-laws/SKILL|symmetry-and-conservation-laws]] for the charge-conservation/gauge link.
7. **Waves and radiation: propagate, then track the energy.** In source-free media Maxwell yields $\nabla^2\mathbf E=\mu\epsilon\,\partial_t^2\mathbf E$, so $v=1/\sqrt{\mu\epsilon}$ ($=c$ in vacuum) with $\mathbf E\perp\mathbf B\perp\hat k$; energy flows as the Poynting vector $\mathbf S=\tfrac1{\mu_0}\mathbf E\times\mathbf B$ (SI). Accelerating charges radiate: total power by Larmor $P=\tfrac{q^2 a^2}{6\pi\epsilon_0 c^3}$ (SI). Cross-link wave structure to [[skills/waves-and-oscillations/SKILL|waves-and-oscillations]] and the tensor transformation of $(\mathbf E,\mathbf B)$ to [[skills/special-and-general-relativity/SKILL|special-and-general-relativity]].

## The rigor standard

- **The unit system is stated before the first equation**, and no formula silently assumes SI. Gaussian and natural results are labelled as such.
- **Every solution is verified against Maxwell** — the candidate $\phi$, $\mathbf A$, or field is substituted back and shown to satisfy the field equation off the sources.
- **Every interface condition is checked explicitly**, one row per boundary — continuity of $B_\perp,E_\parallel$ and the correct $D_\perp,H_\parallel$ jumps, not assumed.
- **The static and far-field limits are exhibited** — the solution reduces to the known monopole/dipole or DC behaviour where it must.
- **Gauge choice is named and observables are gauge-independent**; a physical answer depending on $\chi$ is rejected.

## Checkable output

End with a **field-solution verification ledger** the reviewer can audit against the candidate — each row ties a method to the Maxwell/BC checks and the limit/units check that must both pass:

```
PROBLEM                     METHOD        SOLUTION φ or B              MAXWELL & BC CHECK                     LIMIT / UNITS CHECK
grounded plane + charge q   image −q      φ=kq(1/r₊ − 1/r₋)           ∇²φ=0 off-charge ✓, φ=0 on plane ✓     r→∞ dipole-like ✓, SI ✓
sphere in uniform E₀        separation    φ=−E₀(r−R³/r²)cosθ          ∇²φ=0 ✓, φ=const on r=R ✓              r→∞ ⇒ −E₀ r cosθ ✓, SI ✓
localized ρ, far field      multipole     φ=k[Q/r + p·r̂/r²+…]        ∇²φ=0 for r>0 ✓, matches ∮E·dA ✓       leading term = Q/r ✓, SI ✓
infinite solenoid, n turns  Ampère        B=μ₀nI ẑ inside, 0 out      ∇·B=0 ✓, B_∥ jump = μ₀K ✓              I→0 ⇒ B→0 ✓, SI ✓
oscillating dipole          retarded A    S=(…)sin²θ/r² r̂            ∇×B=μ₀ε₀∂ₜE ✓, radiation-zone ✓        near-field ⇒ static dipole ✓, SI ✓
```

Mandatory under **both** profiles for any claimed field solution: under `pure` the ledger backs the first-principles derivation (hold the proof to `mathematical-rigor`); under `applied` it is the sanity check run before reporting a field or force. Solve the underlying PDEs/vector-calculus identities with `calculus-and-analysis` and `differential-equations`; audit homogeneity with `dimensional-analysis`.

## Anti-patterns (reject these in review)

- **Quoting an SI formula in a Gaussian problem** (or vice versa) — dropping or inserting stray $4\pi$/$c$ factors because the convention was never fixed.
- **Skipping a boundary condition** — matching only $E_\parallel$ and forgetting the $D_\perp=\sigma_f$ jump, so the surface charge is wrong.
- **Placing an image charge in the physical region** — images live *outside* the domain they correct; one inside changes the actual sources.
- **Reporting a gauge-dependent "observable"** — quoting $\mathbf A$ or $\phi$ as if measurable, or letting a residual $\chi$ survive into a field.
- **Truncating a multipole expansion inside the source** — the $1/r^{\ell+1}$ series only converges outside the charge distribution.
- **Claiming a wave/radiation result without the far-field or static limit check** — no reduction to the known DC field or $1/r$ radiation falloff.
