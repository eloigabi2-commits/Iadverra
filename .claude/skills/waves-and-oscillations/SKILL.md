---
name: waves-and-oscillations
description: "Use whenever a system oscillates, resonates, or propagates a disturbance — a mass on a spring, a driven damped circuit, coupled pendula, a plucked string, a wave packet. Reduces the system to its normal modes or its dispersion relation $\\omega(k)$, superposes them to build any motion, and hard-checks the result against energy conservation, the small-amplitude/linear limit, dimensions, and the non-dispersive / weak-damping limits. Turns 'it wiggles' into a mode spectrum you can audit."
---

# Waves and Oscillations

Almost every stable system, pushed slightly, oscillates — and the whole machinery of modes,
superposition, and dispersion is how physicists turn a complicated wiggle into a sum of simple
ones. This skill reduces an oscillatory or propagating system to its normal modes (a finite
eigenproblem) or its dispersion relation $\omega(k)$ (the continuum limit), then reconstructs
any motion by superposition and verifies it never invents or loses energy.

## Method

1. **Linearize around equilibrium and identify the oscillator.** Expand the potential to quadratic
   order; the generic single mode obeys $\ddot x+\omega_0^2 x=0$ with $\omega_0^2=k/m$ (or
   $V''(x_0)/m$). Confirm the small-amplitude regime — nonlinear terms deferred means every result
   below is a leading-order truth, not an exact one.
2. **Add damping, then classify by the discriminant.** With $\ddot x+2\gamma\dot x+\omega_0^2x=0$
   the roots are $-\gamma\pm\sqrt{\gamma^2-\omega_0^2}$: **under**damped ($\gamma<\omega_0$, decaying
   oscillation at $\omega_d=\sqrt{\omega_0^2-\gamma^2}$), **critical** ($\gamma=\omega_0$), **over**damped
   ($\gamma>\omega_0$). State which regime and why.
3. **Drive it and read off resonance.** For $\ddot x+2\gamma\dot x+\omega_0^2x=F_0\cos\omega t/m$ the
   steady-state amplitude is $A(\omega)=\dfrac{F_0/m}{\sqrt{(\omega_0^2-\omega^2)^2+4\gamma^2\omega^2}}$,
   peaking near $\omega\approx\omega_0$ with phase lag $\tan\delta=\dfrac{2\gamma\omega}{\omega_0^2-\omega^2}$.
   Report the quality factor $Q=\omega_0/2\gamma$ (sharpness of the peak, cycles to decay).
4. **For coupled oscillators, build the eigenproblem and defer the solve.** Write $M\ddot{\mathbf x}=-K\mathbf x$;
   normal modes are $\det(K-\omega^2 M)=0$ with eigenvectors giving the mode shapes. Hand the actual
   eigenvalue/eigenvector extraction to `linear-algebra`; keep here the physics — mode frequencies
   $\omega_i$ and mass-orthogonality $\mathbf a_i^\top M\mathbf a_j=0$ ($i\ne j$), which decouples the energy.
5. **Take the continuum limit to the wave equation and quantize with boundaries.** $\partial_t^2\psi=v^2\partial_x^2\psi$
   admits traveling $\psi=f(x\mp vt)$ and standing $\psi=X(x)T(t)$ solutions; the **boundary conditions**
   (fixed/free ends, open/closed pipe) select the allowed $k_n$ and hence the discrete spectrum
   $\omega_n=v k_n$ (e.g. $k_n=n\pi/L$). The boundary makes the spectrum, not the wave equation.
6. **Superpose modes; decompose a general disturbance.** Any solution is $\psi(x,t)=\sum_n c_n\,\phi_n(x)e^{-i\omega_n t}$;
   fix $c_n$ by projecting the initial shape onto the modes (Fourier decomposition). Defer convergence
   of that series — Gibbs, completeness, term-by-term differentiation — to `calculus-and-analysis`.
7. **Extract the dispersion relation and separate the two velocities.** From $\omega(k)$ compute
   **phase** $v_p=\omega/k$ (crest speed) and **group** $v_g=d\omega/dk$ (envelope / energy speed).
   Non-dispersive $\Rightarrow$ $\omega=vk$ $\Rightarrow$ $v_p=v_g$; dispersive media spread packets and
   the two diverge. State which case holds.
8. **Track the energy and the boundary.** Oscillator energy $E=\tfrac12 m\dot x^2+\tfrac12 kx^2$ (per mode);
   wave energy density $\propto(\partial_t\psi)^2+v^2(\partial_x\psi)^2$. At an interface of impedance
   $Z=\rho v$, reflection $r=\dfrac{Z_1-Z_2}{Z_1+Z_2}$ and transmission must satisfy $R+T=1$ — energy
   is conserved across the join or the match is wrong.

## The rigor standard

- **Every claimed mode is verified**: substitute $\phi_n e^{-i\omega_n t}$ back into the equation and
  confirm it satisfies both the dynamics and the boundary conditions — a frequency that violates the
  end condition is not a mode.
- **Energy is the arbiter.** Undriven and undamped $\Rightarrow$ total energy constant; damped $\Rightarrow$
  monotonically decreasing; at a boundary $R+T=1$. A solution that fails the energy ledger is rejected.
- **Dimensions and limits are non-negotiable**: check $[\omega]=\mathrm{s^{-1}}$ and $[v]=\mathrm{length/time}$
  (via `dimensional-analysis`), and recover known limits — $\gamma\to0$ gives $Q\to\infty$, weak coupling
  gives nearly-degenerate modes, non-dispersive gives $v_p=v_g$.
- **Modes are orthogonal or the decoupling is fake.** If $\mathbf a_i^\top M\mathbf a_j\ne0$ for $i\ne j$,
  the energy does not split cleanly and the "normal modes" are miscomputed.
- **Linearity is stated, not assumed silently** — every superposition result is flagged as valid only in
  the small-amplitude regime.

## Checkable output

Produce a **mode / dispersion verification ledger**: one row per subsystem, listing the normal modes or
$\omega(k)$, the method used, an energy/amplitude check, and a limit/units check. This is **mandatory under
both profiles** — under `pure` it backs the eigen-derivation; under `applied` it is the sanity pass before
any number ships. Frequencies follow `config.units`; symbolic solves use the configured CAS
(`config.cas`: sympy|sage|none), numbers to `config.sig_figs`.

```
SYSTEM                  NORMAL MODES / ω(k)              METHOD          ENERGY / AMPLITUDE CHECK            LIMIT / UNITS CHECK
two masses + 3 springs  ω±² = {k/m, 3k/m}                eigenproblem    modes orthogonal, energy splits ✓  equal-mass symmetric mode ✓, [ω]=s⁻¹ ✓
driven damped SHO       resonance at ω ≈ ω₀              steady state    Q = ω₀/2γ, peak amplitude finite ✓ γ→0 ⇒ Q→∞ ✓
string fixed both ends  ωₙ = nπv/L,  n=1,2,…             BC quantization standing-wave energy const ✓       n=1 fundamental ✓, [ω]=s⁻¹ ✓
deep-water surface wave ω = √(gk),  v_p=2v_g             dispersion      packet spreads, ⟨E⟩ conserved ✓    v_p=v_g fails ⇒ dispersive ✓
wave at Z₁|Z₂ boundary  r=(Z₁−Z₂)/(Z₁+Z₂)               impedance match R + T = 1 ✓                        Z₁=Z₂ ⇒ r=0 (no reflection) ✓
```

## Anti-patterns

- **Confusing phase and group velocity** — quoting $v_p=\omega/k$ as "the speed of the signal" in a
  dispersive medium, where energy and information travel at $v_g=d\omega/dk$.
- **Writing down mode frequencies without imposing the boundary conditions** — the wave equation alone
  gives a continuum; only the ends quantize $k_n$, and skipping them invents a wrong spectrum.
- **Superposing in a regime that isn't linear** — adding modes of a large-amplitude pendulum or a
  shock-forming wave, where the governing equation is nonlinear and superposition fails.
- **Reporting a resonance amplitude that diverges** — forgetting the $\gamma$ term, so $A(\omega_0)\to\infty$
  instead of the finite $F_0/(2m\gamma\omega_0)$; real dissipation always caps the peak.
- **Calling eigenvectors "modes" without checking orthogonality** — presenting a coupled solution whose
  energy does not decouple across the claimed modes.
- **Dropping reflection at an impedance mismatch** — treating a boundary as perfectly transmitting so
  that $R+T\ne1$ and energy is silently gained or lost.
