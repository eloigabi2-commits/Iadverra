---
name: classical-mechanics
description: "Use whenever you set up or solve a mechanics problem — a particle, a constrained body, an orbit, a small oscillation. Picks the formalism that makes the problem easiest (Newtonian when forces are simple, Lagrangian when constraints bite, Hamiltonian when phase-space structure matters), reads conserved momenta off cyclic coordinates, and verifies the equations of motion by energy conservation, a dimensional check, and the appropriate limit. Emits a setup + conserved-quantity + limit ledger; equations of motion that fail their limit are wrong."
---

# Classical Mechanics

Most of the labor in a mechanics problem is spent before any integration: the wrong formalism
turns a two-line derivation into a page of vector bookkeeping. This skill chooses the formalism
that exposes the structure, extracts the conserved quantities that reduce the work, and holds the
resulting equations of motion to three independent checks. It is where the method spine —
symmetry, limits — meets the machinery of $L$, $H$, and generalized coordinates.

## Method

1. **Count constraints and pick the formalism.** With simple, few forces and no constraints, stay
   **Newtonian**: draw the free-body diagram, sum forces, write $m\ddot{\mathbf r}=\sum\mathbf F$.
   With holonomic constraints $f(\mathbf q,t)=0$ and awkward geometry, go **Lagrangian**: choose
   generalized coordinates $q_i$ that already satisfy the constraints, so the constraint forces
   never appear. When conserved structure or phase-space flow is the point, go **Hamiltonian**.
2. **Build the Lagrangian and apply Euler–Lagrange.** Write $L=T-V$ in the $q_i$, then
   $\frac{d}{dt}\frac{\partial L}{\partial\dot q_i}-\frac{\partial L}{\partial q_i}=0$ per coordinate.
   The generalized momentum is $p_i=\partial L/\partial\dot q_i$. This is the default for constrained
   systems: the coordinates carry the geometry and the equations of motion fall out mechanically.
3. **Read conserved momenta off cyclic coordinates.** A coordinate absent from $L$ (cyclic /
   ignorable) has $\partial L/\partial q_i=0$, so $\dot p_i=0$ — its conjugate momentum is conserved.
   This is the fast route to constants of motion; tie each one to its symmetry via
   [[skills/symmetry-and-conservation-laws/SKILL|symmetry-and-conservation-laws]] (cyclic $t$ → energy,
   cyclic angle → angular momentum). If $L$ has no explicit $t$, the Jacobi integral
   $h=\sum_i\dot q_i\,p_i-L$ is conserved — equal to $E$ only when the coordinates are not themselves
   time-dependent (e.g. a hoop spun at fixed $\omega$).
4. **Pass to Hamiltonian form when phase space matters.** Legendre-transform
   $H=\sum_i p_i\dot q_i-L$, expressed in $(q_i,p_i)$, then Hamilton's equations
   $\dot q_i=\partial H/\partial p_i,\ \dot p_i=-\partial H/\partial q_i$. A quantity $G$ is conserved
   iff its Poisson bracket $\{G,H\}=0$; $\{q_i,p_j\}=\delta_{ij}$. Use this for conserved-structure
   questions, canonical transformations, and phase-space (Liouville) flow.
5. **Reduce central-force and rigid-body problems with their conserved quantities.** For a central
   potential, $\mathbf L$ fixed ⇒ planar motion ⇒ a 1-D radial problem in the effective potential
   $V_{\rm eff}(r)=V(r)+L^2/2mr^2$; read turning points and orbit shape off $V_{\rm eff}$. For a rigid
   body, work in principal axes where $I$ is diagonal, $\mathbf L=I\boldsymbol\omega$, and rotational
   kinetic energy is $\tfrac12\boldsymbol\omega^{\!\top}I\boldsymbol\omega$.
6. **Linearize about equilibrium for small oscillations.** At a stable equilibrium ($\partial V/\partial
   q_i=0$, Hessian positive-definite), expand to quadratic order: $T\approx\tfrac12\dot q^{\top}M\dot q$,
   $V\approx\tfrac12 q^{\top}K q$. Normal frequencies and modes solve the generalized eigenproblem
   $\det(K-\omega^2 M)=0$ — hand the eigenvalue mechanics to `linear-algebra`, and the wave/mode
   propagation content to [[skills/waves-and-oscillations/SKILL|waves-and-oscillations]].
7. **Verify the equations of motion three ways.** (a) Energy: confirm $dE/dt=0$ (or that the Jacobi
   integral is the conserved quantity) against the derived motion. (b) Dimensions: every term of each
   equation carries the same units — defer to `dimensional-analysis`. (c) Limit: recover a known case —
   small-angle SHM, weak coupling, a decoupled subsystem — via
   [[skills/limiting-cases-and-asymptotics/SKILL|limiting-cases-and-asymptotics]].
8. **State when the regime leaves Newtonian mechanics.** If speeds approach $c$, if a frame is
   non-inertial in a way that matters, or if gravity is strong, classical mechanics is the wrong tool —
   hand off to [[skills/special-and-general-relativity/SKILL|special-and-general-relativity]] rather
   than patching. Respect `config.units`: under `natural`, keep the same bookkeeping with $c=1$.

## The rigor standard

- **The formalism choice is justified, not defaulted** — a one-line reason (few forces / constraints /
  phase-space structure) precedes the setup, so a reviewer can see why Lagrange beats Newton here.
- **Every conserved quantity is traced to a cyclic coordinate or explicit symmetry**, not asserted;
  and $E$ vs. Jacobi integral is distinguished whenever coordinates carry explicit time dependence.
- **The equations of motion pass all three checks** — energy, dimensions, and one named limit — before
  the result is reported; a failed limit voids the derivation.
- **Constraints are classified** (holonomic vs. not) and the generalized coordinates are shown to
  satisfy them, so no constraint force is silently dropped.

## Checkable output

End with a **setup + conserved-quantity + limit ledger** the reviewer can audit against the derivation:
each row names the system, the chosen formalism and why, the equation of motion, the conserved quantity
with its origin, and the three checks. Mandatory under **both** profiles — under `pure` it backs the
first-principles derivation, under `applied` it is the sanity pass before a number ships.

```
SYSTEM                  FORMALISM (why)          EOM                          CONSERVED (origin)         CHECKS (energy · units · limit)
simple pendulum         Lagrangian (1 constraint) θ̈ = −(g/ℓ)sinθ             E (cyclic t)               dE/dt=0 · [T]=1/s² · small-θ SHM ✓
bead on rotating hoop    Lagrangian (constraint)  θ̈ = ω²sinθcosθ − (g/R)sinθ  Jacobi h (not E; ω≠0)      h const · units ✓ · ω→0 pendulum ✓
Kepler orbit            Newtonian + L reduction   r̈ = L²/m²r³ − GM/r²          E, L (cyclic φ)            dE/dt=0 · units ✓ · L²/mr²→0 radial ✓
2-mass 2-spring chain   Lagrangian → normal modes  M q̈ = −K q                  E; ω_± modes               dE/dt=0 · [ω²]=1/s² · k₁₂→0 decouple ✓
1-D SHO (phase space)   Hamiltonian               q̇=p/m, ṗ=−kq                E=H; {H,H}=0               ellipse area ✓ · units ✓ · —
```

## Anti-patterns

- **Grinding Newtonian vector equations through a constraint** a good coordinate choice would have
  erased — solving a bead-on-wire with normal forces instead of one generalized coordinate.
- **Calling the Jacobi integral "energy"** when the coordinates carry explicit time dependence
  (rotating hoop, moving support); $h$ is conserved, $E$ need not be.
- **Asserting a conserved momentum without pointing to its cyclic coordinate** or symmetry — a guess,
  not a derivation.
- **Reporting equations of motion with no limit check** — never confirming the pendulum reduces to SHM
  at small $\theta$, or a coupled system decouples at zero coupling.
- **Linearizing about an unstable or non-equilibrium point** — expanding where $\partial V/\partial q\neq0$
  or the Hessian is not positive-definite yields imaginary "frequencies" mistaken for modes.
- **Patching Newtonian mechanics into the relativistic or strong-gravity regime** instead of handing off.
