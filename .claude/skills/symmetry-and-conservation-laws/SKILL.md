---
name: symmetry-and-conservation-laws
description: "Use whenever you are about to solve, or have just solved, a dynamical system — before choosing coordinates and after writing an answer. Finds the symmetry group, extracts each conserved quantity via Noether, uses conservation to reduce degrees of freedom and shortcut the derivation, and hard-checks the result: a candidate answer that changes a quantity the system's symmetry conserves is wrong, full stop. The physicist's first move, made executable."
---

# Symmetry and Conservation Laws

The physicist's first move is not to compute — it is to look for what does not change. Every
continuous symmetry of the action hands you a conserved quantity for free (Noether), and every
conserved quantity is both a shortcut (one less coordinate to integrate) and a falsifier (any
step that violates it is a wrong step). This skill turns "spot the symmetry" from intuition into
a checkable procedure.

## Method

1. **Name the symmetry group before choosing coordinates.** Inspect the action $S=\int L\,dt$
   (or $H$, or the Lagrangian density): which transformations leave it invariant? Translations
   in $t$, translations/rotations in space, boosts, internal/gauge phase $\psi\to e^{i\alpha}\psi$,
   scaling. Adapt coordinates to the group — cyclic (ignorable) coordinates are the payoff.
2. **Apply Noether: each continuous symmetry $\leftrightarrow$ a conserved current.** A one-parameter
   symmetry with generator $\delta q$ conserves $Q=\dfrac{\partial L}{\partial \dot q_i}\,\delta q_i - L\,\delta t$.
   The field version conserves a current with $\partial_\mu j^\mu = 0$, so the charge
   $Q=\int j^0\,d^3x$ is constant. Derive $Q$, don't guess it.
3. **Read off the canonical correspondences.** Time-translation $\to$ energy $E$;
   spatial-translation $\to$ momentum $\mathbf p$; rotation $\to$ angular momentum $\mathbf L$;
   internal phase / gauge symmetry $\to$ charge $q$. A coordinate absent from $L$ (cyclic)
   means its conjugate momentum is conserved — the fastest way to spot a constant of motion.
4. **Use conservation to reduce degrees of freedom.** Each conserved $Q$ is a first integral:
   it lowers the order of the equations of motion. Central force $\Rightarrow$ $\mathbf L$ fixed
   $\Rightarrow$ motion is planar and $r(t)$ reduces to a 1-D problem in an effective potential
   $V_{\rm eff}(r)=V(r)+L^2/2mr^2$. Solve the reduced problem, not the full one.
5. **In quantum contexts, a symmetry is an operator commuting with $H$.** $[Q,H]=0$ means $Q$
   is conserved ($\hbar\,\dot{\langle Q\rangle}=i\langle[H,Q]\rangle=0$), $Q$ and $H$ share
   eigenstates, and the symmetry organizes the spectrum: degeneracies are labelled by the
   group's representations. Diagonalize $Q$ to block-diagonalize $H$.
6. **Classify the discrete symmetries and impose their selection rules.** Parity $P$,
   time-reversal $T$, charge-conjugation $C$: check which commute with $H$. They forbid
   transitions and constrain matrix elements — e.g. $\langle f|O|i\rangle=0$ unless parities
   satisfy $P_f\,P_O\,P_i=+1$. A predicted transition that violates an exact selection rule
   is excluded.
7. **Flag spontaneous symmetry breaking explicitly.** If the laws (the $H$ or action) carry a
   symmetry the *ground state* does not, say so: the conservation law still holds globally, but
   the state picks a direction, degeneracy is lifted along it, and a massless (Goldstone) mode
   or order parameter appears. Under `config.units=natural` ($\hbar=c=1$) keep the same
   bookkeeping with those factors set to 1.

## The rigor standard (what "done right" means)

- **Every conserved quantity is derived from a named symmetry, not asserted.** "$E$ is
  conserved" is incomplete; "$L$ has no explicit $t$-dependence $\Rightarrow \dot E=0$" is complete.
- **Verification is non-negotiable:** each ledger row shows $dQ/dt=0$ (classical) or $[Q,H]=0$
  (quantum) actually checked against the candidate solution — not the expectation that it holds.
- **A result that changes a conserved quantity is rejected outright.** No error bar, no
  "approximately": if the symmetry is exact, its $Q$ is exact, and a violation localizes the bug.
- **Broken symmetries are labelled as such** — symmetry-of-laws vs. symmetry-of-state are never
  conflated, since only the former guarantees the conservation law.

## Checkable output

End with a **conserved-quantity ledger** the reviewer can audit against the candidate solution:

```
SYMMETRY                 GENERATOR   CONSERVED QUANTITY   USED AS                         VERIFIED
time-translation         ∂_t         energy E             reduces EOM order               dE/dt = 0     ✓
spatial-translation      ∂_x         momentum p_x         CM motion trivial               dp_x/dt = 0   ✓
rotational (about z)     L_z         L_z                  central-force orbit planar      dL_z/dt = 0   ✓
internal phase e^{iα}    Q̂          electric charge q    superselection sector fixed     [Q̂,H] = 0     ✓
parity P                 P̂          P eigenvalue         selection rule ⟨f|x|i⟩: ΔP=−1   [P,H] = 0     ✓
scale (V ∝ 1/r)          —           (not a symmetry)     —                               virial only   ✗
```

Mandatory under **both** profiles for any claimed solution of a dynamical system: under `pure`
the ledger backs the first-principles Noether derivation; under `applied` it is the fast sanity
check run before reporting a number. Cross-check the energy/momentum rows against a
[[skills/limiting-cases-and-asymptotics/SKILL|limiting-cases-and-asymptotics]] limit and the
Noether derivation against [[skills/classical-mechanics/SKILL|classical-mechanics]]; the $[Q,H]=0$
rows against [[skills/quantum-mechanics/SKILL|quantum-mechanics]] degeneracy structure. Hold the
derivation itself to the proof standard in `mathematical-rigor`.

## Anti-patterns (reject these in review)

- **Asserting a conservation law without its symmetry** — energy "obviously" conserved in a system
  with an explicitly time-dependent driving $H(t)$; it is not.
- **A candidate answer that quietly changes $E$, $\mathbf p$, or $\mathbf L$** and is kept anyway
  because "the algebra looks right." The symmetry outranks the algebra.
- **Confusing symmetry of the laws with symmetry of the state** — expecting a magnetized ferromagnet
  or a chosen vacuum to be rotationally invariant just because $H$ is.
- **Ignoring a selection rule** — predicting a $P$- or $C$-forbidden transition without checking
  the discrete quantum numbers.
- **Choosing coordinates before finding the symmetry** — grinding Cartesian equations for a
  central-force problem instead of using $L_z$ to reduce to one radial coordinate.
