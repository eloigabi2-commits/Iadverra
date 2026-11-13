---
name: particle-physics-and-the-standard-model
description: "Use whenever you reason about elementary particles and their interactions — deciding whether a process is allowed or forbidden, computing decay widths, branching ratios, lifetimes, or cross-sections, or tracking quantum numbers across a vertex. Assigns every state its charges under $SU(3)_C\\times SU(2)_L\\times U(1)_Y$, balances the conserved quantum numbers, names the mediating force that decides allowed vs. forbidden, and cross-checks every quoted mass/width/BR against the current PDG world-average. The bookkeeping that turns 'that reaction happens' from intuition into a checkable verdict."
---

# Particle Physics and the Standard Model

A process in particle physics is decided before any amplitude is squared: by which quantum
numbers balance and which of the four interactions can carry it. Assign every particle its
charges under the gauge group $SU(3)_C\times SU(2)_L\times U(1)_Y$, demand the conserved ones
balance across the reaction, name the force that mediates it, and only then quote a rate — always
against the measured world average. This skill makes that verdict executable, and holds it to
the Review of Particle Physics as the reference standard.

## Method

1. **Fix the particle content and its quantum numbers first.** Three generations of quarks
   ($u,d,c,s,t,b$: color triplets, $SU(2)_L$ doublets for left-handed chirality) and leptons
   ($e,\mu,\tau$ and their $\nu$); the gauge bosons $g,\gamma,W^\pm,Z$; the Higgs. For each state
   tabulate electric charge $Q=T_3+Y$, color, weak isospin $T_3$, hypercharge $Y$, baryon number
   $B$ ($=1/3$ per quark), lepton number $L$ (per family $L_e,L_\mu,L_\tau$), spin, and parity.
2. **Identify the mediating interaction — it decides the selection rules.** Strong (gluons,
   color) and electromagnetic (photon, $Q$) conserve flavor, parity $P$, and charge-conjugation
   $C$. The weak interaction (via $W^\pm,Z$) is the *only* one that changes flavor, violates $P$
   and $C$ maximally, and enables $CP$ violation. Name the force before ruling a process in or out.
3. **Balance every conserved quantum number across the reaction.** Electric charge, color
   (net singlet), $B$, and each lepton flavor $L_\ell$ must match initial $\to$ final. Angular
   momentum and, for strong/EM vertices, $P$ and $C$ must balance too. A single unbalanced exact
   charge forbids the process regardless of energy.
4. **Rule allowed vs. forbidden.** A process is allowed only if (a) some interaction can mediate
   every vertex, (b) all quantum numbers that interaction conserves balance, and (c) it is
   kinematically open, $\sum m_{\rm final}\le \sqrt{s}$. Flavor-changing or $P$-violating steps
   force the weak channel and its smaller coupling; a step that violates $B$ or total $L$ has no
   SM mediator at all (forbidden; proton decay is the archetype, seen only as a lifetime limit).
5. **Quantify the rate: width, lifetime, branching ratio.** Total width and lifetime obey
   $\Gamma=\hbar/\tau$; each channel has $\Gamma_i$ with $\mathrm{BR}_i=\Gamma_i/\Gamma_{\rm tot}$
   and $\sum_i \mathrm{BR}_i=1$ by construction. Fermi's golden rule gives
   $\Gamma=2\pi|\mathcal M|^2\rho_f$ up to phase space; cross-sections $\sigma$ follow the same
   $|\mathcal M|^2\times$(phase space) structure. Under `config.units=natural` ($\hbar=c=1$)
   masses, widths, and momenta are all in eV and $\tau=1/\Gamma$; restore $\hbar,c$ for SI.
6. **Apply mixing where flavor is involved.** Quark charged-current transitions are weighted by
   CKM elements $V_{ij}$ (unitary $3\times3$, one physical $CP$-violating phase); neutrino flavor
   change is governed by the PMNS matrix and oscillation phase $\propto \Delta m^2 L/E$.
   Cabibbo-suppressed and loop/box (e.g. mixing, penguin) amplitudes carry the expected powers of
   $|V_{ij}|$ and $\sin\theta$ — a rate off by such a factor signals a missing suppression.
7. **Cross-check every number against the current PDG world-average.** Any quoted mass, width,
   lifetime, or branching ratio is compared to the current Review of Particle Physics value
   (generically — do not transcribe a table); agreement within the combined uncertainty, or a
   consistent limit for a forbidden mode, is part of the answer, not an afterthought. Round to
   `config.sig_figs`. Treat the measured value as the arbiter when derivation and data disagree.

## The rigor standard

- **Every vertex conserves what its interaction conserves, checked explicitly** — not "charge is
  obviously fine," but $Q,\,B,\,L_\ell,\,$color balanced initial $\to$ final on each row.
- **The allowed/forbidden verdict names the mediating force** and the specific conserved quantity
  that permits or blocks it; "forbidden" without naming the violated number is incomplete.
- **Branching ratios of a decaying state sum to 1** and every partial width ties to $\Gamma=\hbar/\tau$;
  a BR table that doesn't close is wrong.
- **Kinematic openness is verified**, $\sum m_{\rm final}\le\sqrt s$, before any rate is quoted.
- **The result is consistent with the current PDG world-average** (or its published limit); a
  derived number with no data cross-check is not finished.

## Checkable output

End with a **process ledger** the reviewer can audit reaction-by-reaction: the quantum numbers
in and out, the allowed/forbidden verdict with its mediating force and the balancing (or violated)
charge, the rate, and the data cross-check against the current world-average.

```
PROCESS                       QUANTUM #s (init → final)          ALLOWED? (force / conservation)     RATE / BR              DATA CROSS-CHECK (PDG world-avg)
μ⁻ → e⁻ ν̄_e ν_μ               L_e:0→0, L_μ:1→1, Q:−1→−1          weak, allowed (all L_ℓ balance)     τ ≈ 2.2 μs             matches world-average ✓
π⁰ → γ γ                       Q:0→0, C:+1→+1, B:0                EM, allowed (C conserved)           BR ≈ 0.99             consistent ✓
n → p e⁻ ν̄_e                   B:1→1, Q:0→0, L_e:0→0              weak (d→u), allowed                 τ ≈ 880 s              consistent ✓
K⁺ → μ⁺ ν_μ                    strangeness 1→0 (ΔS=1)             weak, allowed (Cabibbo-suppr. |V_us|²) BR ≈ 0.64          consistent ✓
p → e⁺ π⁰                      B:1→0, ΔB=1                        no SM mediator — FORBIDDEN          —                      limit only (τ > 10³⁴ yr) ✓
μ⁻ → e⁻ γ                      L_e:0→1, L_μ:1→0                   forbidden (charged LFV, ΔL_ℓ≠0)    —                      limit only ✓
Σ BR over all channels                                                                              = 1.00 ✓
```

Mandatory under **both** profiles: under `pure` the ledger backs the first-principles quantum-number
and amplitude derivation; under `applied` it is the sanity check run before any number is reported.
Verify the kinematics and $\sqrt s$ rows against
[[skills/relativistic-kinematics-and-collisions/SKILL|relativistic-kinematics-and-collisions]], the
amplitude and coupling structure against [[skills/quantum-field-theory/SKILL|quantum-field-theory]],
and the conservation/selection-rule rows against
[[skills/symmetry-and-conservation-laws/SKILL|symmetry-and-conservation-laws]]. Treat rate
measurements and their uncertainties with `probability-and-statistics`, and hold the derivation
itself to the proof standard in `mathematical-rigor`. When the configured CAS (`config.cas`:
sympy|sage|none) is available, use it for CKM/PMNS unitarity and phase-space factors; otherwise
carry the algebra by hand.

## Anti-patterns

- **Declaring a process forbidden without naming the violated quantum number** — or allowed without
  naming a force that can mediate every vertex.
- **Letting the strong or EM interaction change flavor** — e.g. a flavor-changing neutral current
  at tree level; in the SM these are weak, loop-level, and suppressed.
- **A branching-ratio table that does not sum to 1**, or a lifetime quoted without checking
  $\Gamma=\hbar/\tau$ against the partial widths.
- **Quoting a mass, width, or BR with no cross-check** against the current PDG world-average, or
  reporting a "measurement" for a mode that data give only as a limit.
- **Ignoring kinematics** — predicting a decay whose final-state masses exceed the parent, or a
  threshold process below $\sqrt s$.
- **Dropping CKM/PMNS suppression** — treating a Cabibbo- or loop-suppressed rate as if it carried
  full weak strength, so the predicted BR is orders of magnitude too large.
