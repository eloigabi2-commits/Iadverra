---
name: quantum-mechanics
description: "Use whenever a quantum result is derived or reviewed — a wavefunction, a spectrum, a measurement probability, an expectation value — before it is trusted. Works the state/operator formalism explicitly and runs the checks that catch nonsense early: state normalized, observable Hermitian, eigenvalues real, probabilities summing to 1, dimensions consistent, and the classical limit recovered. Emits a normalization/Hermiticity/limit ledger; a result that fails any check is wrong."
---

# Quantum Mechanics

Quantum mechanics is bookkeeping on a Hilbert space: states are vectors, observables are Hermitian
operators, and every physical prediction is an inner product. Most quantum errors are not subtle
physics — they are an unnormalized state, a non-Hermitian "observable", a probability that does not
sum to one, or a formula that never reduces to the classical answer. This skill makes those checks
executable so nonsense is caught before it propagates.

## Method

1. **Fix the state space and write the state.** Choose the Hilbert space and represent the state as
   a ket $|\psi\rangle$ (or wavefunction $\psi(x)=\langle x|\psi\rangle$). Normalize:
   $\langle\psi|\psi\rangle=\int|\psi(x)|^2\,dx=1$. An unnormalized state has no probabilistic
   meaning — normalize first or carry the norm explicitly. Superpositions live in the same space;
   defer vector/eigen mechanics to `linear-algebra`, spinor/Clifford structure to
   `hypercomplex-and-geometric-algebra`.
2. **Represent each observable as a Hermitian operator.** For observable $A$ build $\hat A$ with
   $\hat A^\dagger=\hat A$. Hermiticity guarantees real eigenvalues and an orthogonal eigenbasis
   $\hat A|a\rangle=a|a\rangle$, giving the spectral decomposition $\hat A=\sum_a a\,|a\rangle\langle a|$
   (or $\int a\,dP_a$). Check $\langle a|a'\rangle=\delta_{aa'}$ and $a\in\mathbb R$ before using
   them.
3. **Predict measurements with the Born rule.** The probability of outcome $a$ is
   $P(a)=|\langle a|\psi\rangle|^2$ (density $|\langle a|\psi\rangle|^2$ for continuous spectra), and
   measurement collapses $|\psi\rangle\to|a\rangle$. Expectation value $\langle A\rangle=\langle\psi|\hat A|\psi\rangle$.
   The completeness $\sum_a|a\rangle\langle a|=\mathbb 1$ forces $\sum_a P(a)=1$ — verify it.
4. **Compute commutators and read off compatibility.** Evaluate $[\hat A,\hat B]=\hat A\hat B-\hat B\hat A$;
   the canonical relation is $[\hat x,\hat p]=i\hbar$ (under `config.units=natural`, $\hbar=1$).
   $[\hat A,\hat B]=0$ means a shared eigenbasis and simultaneous measurability; otherwise the
   uncertainty relation $\sigma_A\sigma_B\ge\tfrac12|\langle[\hat A,\hat B]\rangle|$ bounds joint
   precision. A claimed simultaneous sharp value for non-commuting observables is excluded.
5. **Evolve with the Schrödinger equation.** Time-dependent: $i\hbar\,\partial_t|\psi\rangle=\hat H|\psi\rangle$.
   Separating variables gives the time-independent $\hat H|E\rangle=E|E\rangle$ and stationary states
   $|\psi(t)\rangle=e^{-iEt/\hbar}|E\rangle$, whose observables are time-independent. A general state is
   $\sum_n c_n e^{-iE_n t/\hbar}|E_n\rangle$; unitary evolution preserves $\langle\psi|\psi\rangle=1$,
   so a norm that drifts signals an error.
6. **Use symmetry to fix degeneracy and conserved labels.** An operator with $[\hat Q,\hat H]=0$ is
   conserved ($\hbar\,\tfrac{d}{dt}\langle\hat Q\rangle=i\langle[\hat H,\hat Q]\rangle=0$), shares
   eigenstates with $\hat H$, and labels the spectrum — degenerate levels organize into the symmetry's
   representations. Diagonalize $\hat Q$ to block-diagonalize $\hat H$; see
   [[skills/symmetry-and-conservation-laws/SKILL|symmetry-and-conservation-laws]].
7. **Recover the classical limit.** Ehrenfest's theorem gives $\tfrac{d}{dt}\langle\hat x\rangle=\langle\hat p\rangle/m$
   and $\tfrac{d}{dt}\langle\hat p\rangle=-\langle\partial_x V\rangle$: expectation values obey the
   classical equations. As $\hbar\to0$ or at large quantum number $n$ the correspondence principle
   must hold — the probability density approaches the classical distribution. Route the limit through
   [[skills/limiting-cases-and-asymptotics/SKILL|limiting-cases-and-asymptotics]].
8. **Verify every result before shipping.** Confirm: state normalized, operator Hermitian,
   eigenvalues real, probabilities sum to 1, dimensions consistent, classical limit recovered.
   Record each on the ledger. For quantum ensembles and occupation statistics, hand off to
   [[skills/statistical-mechanics-and-thermodynamics/SKILL|statistical-mechanics-and-thermodynamics]].

## The rigor standard

- **Every state is normalized and every observable is Hermitian before it is used** — not assumed;
  $\langle\psi|\psi\rangle=1$ and $\hat A^\dagger=\hat A$ are shown, and complex eigenvalues for a
  supposed observable are a hard fault.
- **Probabilities are non-negative and sum (or integrate) to exactly 1** — a total that misses one
  localizes a missing basis state or a normalization slip.
- **Non-commuting observables are never assigned simultaneous sharp values**, and any precision claim
  respects $\sigma_A\sigma_B\ge\tfrac12|\langle[\hat A,\hat B]\rangle|$.
- **Dimensions are consistent under `config.units`** — energies as energies, $\hbar$ carried unless
  `natural` sets it to 1 — and the classical limit is exhibited, not asserted.
- **A result failing any check is withdrawn or corrected**, not excused with an error bar.

## Checkable output

End with a **normalization/Hermiticity/limit ledger** the reviewer can rerun: for each claimed
state or result, its formalism, the four core checks ($\langle\psi|\psi\rangle=1$, operator
Hermitian, eigenvalue real, $\sum P=1$), and the classical limit it reduces to.

```
CLAIM / STATE                 FORMALISM              CHECKS                                              CLASSICAL LIMIT
infinite well, ground state   separation of vars     ∫|ψ|²=1 ✓, Ĥ†=Ĥ ✓, E₁=π²ħ²/2mL² real ✓, ΣP=1 ✓    large n: uniform density ✓
harmonic osc., level n        ladder operators       ⟨n|n⟩=1 ✓, E_n=ħω(n+½) real ✓, ΣP=1 ✓               n→∞: turning-point density ✓
spin-½ measured in x          two-state Hilbert       ⟨±|±⟩=1 ✓, σ_x Hermitian ✓, ±ħ/2 real ✓, ΣP=1 ✓    no classical spin (flag) ✓
free wave packet ⟨x⟩(t)       Schrödinger evolution  norm preserved ✓, ⟨x⟩ real ✓                        Ehrenfest: d⟨x⟩/dt=⟨p⟩/m ✓
x,p joint precision           canonical [x̂,p̂]=iħ    σ_x σ_p ≥ ħ/2 ✓                                     ħ→0: sharp trajectory ✓
"observable" Â, Â†≠Â          —                      Hermiticity ✗ → reject                              —
```

Mandatory under **both** profiles for any quantum result: under `pure` the ledger backs the
first-principles derivation held to `mathematical-rigor`; under `applied` it is the sanity pass run
before a number is reported. Diagonalization and inner products use the configured CAS
(`config.cas`: sympy|sage|none).

## Anti-patterns

- **Skipping normalization** — reading a probability off an unnormalized $\psi$, so the numbers do
  not sum to 1 and mean nothing.
- **Treating a non-Hermitian operator as an observable** — then puzzling over complex "eigenvalues"
  that should have been the signal to stop.
- **Assigning simultaneous sharp values to non-commuting observables** — a definite $x$ and $p$ at
  once, ignoring $[\hat x,\hat p]=i\hbar$.
- **Probabilities that do not close** — a truncated or non-orthogonal basis leaving $\sum P\neq1$ and
  proceeding anyway.
- **Never taking the classical limit** — shipping a spectrum or dynamics that has no $\hbar\to0$ /
  large-$n$ check, so a wrong sign or factor goes unnoticed.
- **Dropping or mis-carrying $\hbar$** — dimensionally inconsistent energies, or setting $\hbar=1$
  under `config.units` other than `natural`.
