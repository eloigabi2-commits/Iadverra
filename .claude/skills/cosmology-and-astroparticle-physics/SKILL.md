---
name: cosmology-and-astroparticle-physics
description: "Use whenever the expanding universe is the physics problem — scale factor and redshift, the Hubble parameter, the Friedmann equations, density parameters and flatness, how each component (radiation, matter, Λ) dilutes and which dominates in each era, thermal history, Big-Bang nucleosynthesis, recombination/CMB, and the evidence for dark matter and dark energy. Treats the cosmos as GR + thermodynamics + particle physics under one constraint, pins every result to the Friedmann equation and a limiting era, and refuses a result until ΣᵢΩᵢ+Ω_k=1, each ρ scales with the right power of a, the right component dominates, and the numbers track the current measured (PDG) parameters. Emits a cosmology ledger; a component that scales wrong or an era that dominates wrong is a bug."
---

# Cosmology & Astroparticle Physics

The observable universe is a single physics problem: a homogeneous, isotropic spacetime whose one dynamical
degree of freedom — the scale factor $a(t)$ — is driven by whatever energy fills it, under general relativity
and thermodynamics. That reduction is the whole leverage: the Friedmann equation is a first integral that
*every* epoch must satisfy, and each energy component announces itself by how it dilutes as space expands.
This skill makes the expansion history executable and checkable — a component that scales with the wrong power
of $a$, or an era where the wrong component dominates, is caught the moment the ledger is filled.

## Method

1. **Write the FLRW metric and read off the kinematics.** Homogeneity + isotropy fix the line element to
   $ds^2=-c^2dt^2+a(t)^2\left[\frac{dr^2}{1-kr^2}+r^2d\Omega^2\right]$ with spatial curvature $k\in\{-1,0,+1\}$;
   the dynamics live entirely in $a(t)$ (set $a_0=1$ today). Redshift is a pure kinematic stretch of wavelength,
   $1+z=1/a$; the **Hubble parameter** $H=\dot a/a$ gives the local Hubble law $v=Hd$. Honor `config.units` — natural
   units ($\hbar=c=k_B=1$) are the cosmology default; restore SI by dimensional analysis. The GR machinery (metric,
   geodesics, $G_{\mu\nu}$) belongs to [[skills/special-and-general-relativity/SKILL|special-and-general-relativity]].
2. **Impose the Friedmann constraint — the master equation.** Einstein's equation on FLRW gives
   $H^2=\frac{8\pi G}{3}\rho-\frac{k c^2}{a^2}$ and the acceleration equation
   $\frac{\ddot a}{a}=-\frac{4\pi G}{3}\left(\rho+\frac{3P}{c^2}\right)$. The first is a *constraint*, not an
   evolution law you may violate: any $a(t)$ you propose must satisfy it identically at every $t$. Pressure enters
   the second, so acceleration ($\ddot a>0$) requires $P<-\rho c^2/3$ — the signature of dark energy.
3. **Cast content as density parameters and pin flatness.** Define the critical density $\rho_c=3H^2/8\pi G$ and
   $\Omega_i=\rho_i/\rho_c$ for each component (radiation $r$, matter $m$, dark energy $\Lambda$), plus a curvature
   term $\Omega_k=-kc^2/(a^2H^2)$. The Friedmann equation *is* the sum rule $\sum_i\Omega_i+\Omega_k=1$: a spatially
   flat universe ($k=0$) demands $\sum_i\Omega_i=1$ exactly. This is the standing bookkeeping identity every result
   is checked against.
4. **Assign each component its equation of state and dilution law.** With $P=w\rho c^2$, conservation
   $\dot\rho+3H(\rho+P/c^2)=0$ integrates to $\rho\propto a^{-3(1+w)}$. So **radiation** ($w=\tfrac13$)
   $\rho_r\propto a^{-4}$ (density $a^{-3}$ times redshift $a^{-1}$), **matter** ($w=0$) $\rho_m\propto a^{-3}$,
   **cosmological constant** ($w=-1$) $\rho_\Lambda=$ const. Feed $H^2\propto\sum_i\Omega_{i,0}a^{-3(1+w_i)}$ back into
   Friedmann to solve each single-component era: $a\propto t^{1/2}$ (radiation), $a\propto t^{2/3}$ (matter),
   $a\propto e^{Ht}$ (Λ). Hand the $a\to0$/$a\to\infty$ expansions to `limiting-cases-and-asymptotics`.
5. **Order the eras by who wins the dilution race.** Because the powers differ, the dominant component switches as
   $a$ grows: radiation dominates earliest ($a^{-4}$ steepest), then matter ($a^{-3}$), then $\Lambda$ (constant) takes
   over late — the **radiation → matter → Λ** sequence. Equality epochs ($\rho_r=\rho_m$, then $\rho_m=\rho_\Lambda$) are
   found by equating the scalings; each is a **limit check** — verify the intended component actually dominates at the
   redshift you claim.
6. **Run the thermal history and let BBN probe it.** Early on the universe is a hot relativistic plasma with
   $\rho_r\propto T^4$ and $T\propto1/a$; species stay in equilibrium while reaction rates beat $H$ and **freeze out**
   when $\Gamma\lesssim H$. **Big-Bang nucleosynthesis** forges the light elements (D, ³He, ⁴He, ⁷Li) in the first
   minutes; their predicted abundances depend sharply on the baryon-to-photon ratio and the expansion rate, so the
   observed abundances are a precision probe of the early thermal history and of the relativistic degrees of freedom.
   Equilibrium distributions, freeze-out, and entropy come from
   [[skills/statistical-mechanics-and-thermodynamics/SKILL|statistical-mechanics-and-thermodynamics]]; reaction rates and
   relic abundances from [[skills/particle-physics-and-the-standard-model/SKILL|particle-physics-and-the-standard-model]].
7. **Pass through recombination and read the CMB; weigh dark matter and dark energy.** When $T$ drops enough for
   electrons and protons to combine into neutral hydrogen, photons decouple and stream freely — the **cosmic microwave
   background**, a near-perfect blackbody whose temperature and anisotropy spectrum encode $\Omega_b,\Omega_m,\Omega_\Lambda,H_0$.
   Independent handles must agree: galaxy rotation curves, cluster dynamics, lensing, and the CMB all require
   non-luminous **dark matter** ($\Omega_m\gg\Omega_b$); the late-time accelerated expansion (supernovae + CMB + BBN
   concordance) requires **dark energy** ($w\approx-1$). A parameter is trusted only where several probes converge.
8. **Note the astroparticle messengers, then close the ledger.** Relic neutrinos (a cosmic neutrino background,
   colder analogue of the CMB) contribute to $\rho_r$ and, with mass, later to $\Omega_m$; high-energy cosmic rays and
   astrophysical neutrinos test propagation over cosmological distances. Keep these brief. Before reporting, confirm
   every quantity satisfies Friedmann, respects $\sum\Omega=1$ where flat, scales with the correct power of $a$,
   dominates in the correct era, and lands within the current measured (PDG) values.

## The rigor standard

- **The Friedmann equation is satisfied identically, not just at $t_0$** — a proposed $a(t)$ is substituted back and
  shown to hold at every epoch, treating it as a constraint rather than an afterthought.
- **$\sum_i\Omega_i+\Omega_k=1$ is enforced**, and $\Omega_k=0$ is *stated as an assumption* when a flat universe is
  used — flatness is an input to be flagged, never smuggled in.
- **Every component carries its dilution law explicitly** — $\rho_r\propto a^{-4}$, $\rho_m\propto a^{-3}$,
  $\rho_\Lambda=$ const — each traced to its $w$ via $\rho\propto a^{-3(1+w)}$, not asserted.
- **The dominant component is verified by a limit check at the stated redshift**, and the radiation→matter→Λ ordering
  (with its equality epochs) is exhibited, not assumed.
- **Results are dimensionally consistent and cross-checked against current measured parameters** — natural-unit answers
  are restorable to SI by dimensional analysis, and the numbers track the PDG cosmological-parameter values.

## Checkable output

End with a **cosmology ledger** the reviewer can audit line by line: each row names the quantity, the epoch or method,
the Friedmann/scaling check that pins it, the $\sum\Omega$ or era-limit test it must pass, and the data cross-check
against the current measured (PDG) values. Mandatory under **both** profiles — under `pure` it backs the
first-principles derivation of the expansion history, under `applied` it is the sanity pass run before any cosmological
number ships. The conservation-integral and Friedmann-substitution algebra route through the configured CAS
(`config.cas`: sympy|sage|none); send the unit-consistency pass on every entry to `dimensional-analysis`.

```
QUANTITY               EPOCH/METHOD          FRIEDMANN/SCALING CHECK            ΣΩ & ERA-LIMIT                     DATA CROSS-CHECK
a(t) radiation era     Friedmann, ρ∝a⁻⁴      a ∝ t^{1/2} solves H²=8πGρ/3 ✓     radiation dominates early ✓        consistent with BBN ✓
a(t) matter era        Friedmann, ρ∝a⁻³      a ∝ t^{2/3} ✓                      matter dominates z~1–1000 ✓        CMB peak spacing ✓
a(t) Λ era             ρ_Λ = const           a ∝ e^{Ht}, ä>0 (w=−1) ✓           Λ dominates late (z≲0.3) ✓         SNe Ia accel. ✓
redshift↔scale         kinematic, 1+z=1/a    photon λ ∝ a ✓                     —                                  CMB z≈1100 ✓
critical density ρ_c   ρ_c = 3H²/8πG         [ρ_c]=kg/m³ (dim) ✓                sets Ω scale ✓                     matches H₀ obs ✓
flat universe          —                     —                                  Ω_m+Ω_Λ+Ω_r ≈ 1, Ω_k≈0 ✓          matches PDG ✓
r–m equality           ρ_r=ρ_m ⇒ a_eq        a_eq set by Ω_r/Ω_m ✓             radiation→matter handoff ✓         z_eq ~ few×10³ ✓
BBN light elements     T~MeV, Γ≷H freeze-out  n/p set by expansion rate ✓        radiation-dominated ✓             D, ⁴He abundances ✓
dark matter            rotation curves+lens.  Ω_m ≫ Ω_b required ✓               matter era, clusters bound ✓       CMB+lensing concur ✓
```

Ship only when every row's Friedmann/scaling check holds, $\sum\Omega=1$ is satisfied (with $\Omega_k$ accounted),
each component scales correctly, the right era dominates, and the numbers sit within the current measured values.

## Anti-patterns

- **Treating Friedmann as an evolution law to bend rather than a constraint to satisfy** — quoting an $a(t)$ that never
  gets substituted back to verify $H^2=\frac{8\pi G}{3}\rho-\frac{kc^2}{a^2}$ holds at every epoch.
- **Assuming flatness silently** — using $\sum_i\Omega_i=1$ without flagging $\Omega_k=0$ as an assumption, or forgetting
  the curvature term when the problem is not stated flat.
- **Getting a dilution power wrong** — writing $\rho_r\propto a^{-3}$ (forgetting the extra redshift factor) or letting
  $\rho_\Lambda$ dilute, so the era ordering and equality epochs come out wrong.
- **Naming the wrong dominant era** — invoking matter-era $a\propto t^{2/3}$ during BBN (radiation-dominated), or ignoring
  Λ at low redshift where it drives the acceleration.
- **Confusing recession redshift with a Doppler shift** — reading cosmological $1+z=1/a$ as motion through space rather than
  expansion of it, and misusing special-relativistic velocity addition for it.
- **Mixing unit systems mid-derivation** — dropping $c$'s or $k_B$'s ad hoc instead of committing to `config.units` (natural
  $\hbar=c=k_B=1$ is standard here) and restoring SI by dimensional analysis, so factors of $c$ in $\rho_c$ or $T\propto1/a$ go astray.
