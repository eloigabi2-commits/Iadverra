---
name: model-building-and-approximation
description: "Use whenever a result rests on an idealization or an approximation — before you trust any 'ignore friction / small angle / ideal gas / linear response' step and before you report the answer it produced. Names each idealization and what it neglects, finds the small dimensionless parameter that justifies the approximation, builds a controlled expansion on it, states the regime where the model is valid and the failure mode at its boundary, and ships the leading neglected term so the error is a number, not a shrug. Physics is the art of the right idealization, made executable."
---

# Model Building and Approximation

Every physical model is an approximation; competence is knowing *which* one, *why* it is justified,
and *where* it breaks. A point mass, a frictionless plane, an ideal gas, a linear spring — each is a
deliberate discard of some physics, licensed by a small dimensionless number and valid only until
that number stops being small. This skill turns "make a reasonable approximation" into a procedure
that ships its own domain of validity and its own error term.

## Method

1. **Choose each idealization deliberately and write down what it neglects.** Point mass drops
   internal structure and rotation; rigid body drops deformation; ideal gas drops molecular volume
   and interaction $\sim a,b$ in van der Waals; infinite/semi-infinite geometry drops edge and
   finite-size effects; frictionless drops dissipation; linear response drops the next term in the
   constitutive law. No idealization is free — every one leaves a residue, and that residue is what
   you will estimate in step 6.
2. **Identify the small dimensionless parameter $\epsilon$ that licenses the approximation.** An
   approximation is only justified by a number that is small: amplitude-to-scale $\theta$ or $x/L$,
   speed-to-limit $v/c$, mean-free-path-to-size (Knudsen) $\mathrm{Kn}$, coupling $g$, ratio of
   scales $m/M$. If you cannot name $\epsilon$, you are guessing, not approximating. Hand the
   grouping of variables into $\epsilon$ to `dimensional-analysis`.
3. **Build a controlled expansion in $\epsilon$ (regular perturbation theory).** Write the
   quantity as $Q=Q_0+\epsilon Q_1+\epsilon^2 Q_2+\cdots$, solve order by order, and keep the leading
   correction. Example: $\sin\theta=\theta-\tfrac16\theta^3+\cdots$ gives the pendulum period
   $T=2\pi\sqrt{L/g}\,(1+\tfrac{1}{16}\theta_0^2+\cdots)$ — the $\theta^3$ term in $\sin\theta$ *is*
   the leading neglected physics, made numerical.
4. **Know when the expansion fails.** A series can be asymptotic, not convergent; secular terms
   ($\propto t$, or resonant denominators) that grow without bound signal that naive perturbation
   theory has broken and a resummation or multiple-scales treatment is required. And some effects are
   **non-perturbative** — a tunneling amplitude or instanton $\sim e^{-1/g}$ is zero to *every* order
   in $g$ yet nonzero, so no order of the expansion will ever see it. Flag both failure modes rather
   than trusting one more term.
5. **Linearize, and state the radius of validity.** Replace $f(x)$ by $f(x_0)+f'(x_0)(x-x_0)$ and
   record when the dropped $\tfrac12 f''(x-x_0)^2$ ceases to be negligible — the linear regime ends
   where the neglected curvature term rivals the kept one. "Linear" without its validity radius is
   an unbounded claim.
6. **Separate scales and keep only the relevant degrees of freedom (effective description).** When
   scales are cleanly separated, integrate out the fast/heavy/short-distance physics into effective
   parameters and evolve the slow/light/long-distance ones: adiabatic elimination, coarse-graining,
   a low-energy effective theory. State the separation ($\omega_{\rm fast}\gg\omega_{\rm slow}$,
   $m\ll M$) that makes it legitimate — the effective model inherits *its* regime of validity.
7. **State the regime of validity and the failure mode at its boundary.** Every model ships a
   $\epsilon\lesssim\epsilon_\ast$ and a sentence naming *what new physics switches on* when
   $\epsilon\to\epsilon_\ast$ (nonlinearity, dissipation, a phase change, relativistic corrections,
   discreteness). A model without a stated boundary is being trusted outside where it was derived.
8. **Compare competing models by their assumptions, not by fit alone.** Two models can fit the same
   data; prefer the one whose idealizations are *justified in this regime* and whose neglected term is
   demonstrably small here. A better $\chi^2$ from a model used outside its domain is a worse model.
   Hand the leading neglected term to `order-of-magnitude-estimation`/`dimensional-analysis` for a
   numerical error bound. Under `config.units=natural` the same $\epsilon$-bookkeeping holds with
   $\hbar=c=1$.

## The rigor standard (what "done right" means)

- **Every approximation names its $\epsilon$ and its numerical value here.** "Small angle" is
  incomplete; "$\theta_0\approx0.15\,\mathrm{rad}\Rightarrow\theta_0^2/16\approx0.14\%$ period error"
  is complete.
- **The leading neglected term is written down, not waved at.** If you cannot state the first dropped
  term, you cannot claim the error is small — you are asserting it.
- **The regime of validity is a stated inequality with a named failure mode**, not an implicit hope
  that inputs stay reasonable.
- **Non-perturbative and secular failures are flagged**, never hidden by quoting one more order of a
  series that does not converge.
- **Model comparison is by justified assumptions first, fit quality second** — a good fit outside the
  domain of validity is disqualifying, not reassuring.

## Checkable output

End with an **assumptions & regime-of-validity ledger** the reviewer can audit: one row per model or
approximation, each carrying its idealizations, its small parameter, the inequality that bounds its
validity, the leading neglected term, and the failure mode that switches on at the boundary.

```
MODEL                IDEALIZATIONS (neglected)        SMALL PARAM   REGIME OF VALIDITY   LEADING NEGLECTED TERM        BREAKS WHEN
simple pendulum      small angle, massless rod,        θ             θ ≲ 0.2 rad          −(1/6)θ³ in sinθ              amplitude large; period
                     no drag                                                              → +θ₀²/16 in T                becomes amplitude-dependent
ideal gas            no molecular volume, no           nb/V, a/VkT   dilute: nb ≪ V       van der Waals (a,b) corr.     dense/near condensation;
                     interaction                                                          to PV=NkT                    liquid–gas transition
linear spring        Hooke, no anharmonicity           x/L           x ≲ 0.1 L            +½k''x² in F(x)              large stretch; nonlinear
                                                                                                                       resonance / hysteresis
non-relativistic KE  v ≪ c                             (v/c)²        v ≲ 0.1c             +⅜(v/c)² in ½mv²             fast particles; need γ
tunneling (WKB)      classically forbidden barrier     e^{−1/g}      — (non-perturbative) invisible to every order    perturbation theory in g
                                                                                          in g                         misses it entirely
```

Mandatory under **both** profiles whenever a reported result rests on an approximation: under `pure`
the ledger backs the claim that the discarded physics is provably subleading in the stated regime;
under `applied` it is the pre-report check that the operating point actually sits inside the regime of
validity. Cross-check the leading-neglected-term column against
[[skills/order-of-magnitude-estimation/SKILL|order-of-magnitude-estimation]] for its size, the
regime boundaries against [[skills/limiting-cases-and-asymptotics/SKILL|limiting-cases-and-asymptotics]]
(the model must reproduce the exact result as $\epsilon\to0$), and — when the model is fit to data —
the assumptions against [[skills/experimental-method-and-error-analysis/SKILL|experimental-method-and-error-analysis]].
Hold the expansion's convergence and error-order claims to the proof standard in `mathematical-rigor`.

## Anti-patterns (reject these in review)

- **An approximation with no named small parameter** — "we can neglect this" with nothing shown to be
  small; the discard is a guess dressed as a method.
- **Using a model outside its regime and trusting the number** — small-angle formulas at $\theta=1$,
  ideal gas near condensation, linear response at large drive.
- **Reporting a result without its leading neglected term**, so the error is unstated and unestimable.
- **Trusting one more order of a divergent or asymptotic series**, or expecting perturbation theory to
  reveal a $\sim e^{-1/g}$ effect it structurally cannot see.
- **Ignoring secular growth** — keeping a perturbative solution whose correction grows like $t$ well
  past where it overtakes the leading term.
- **Picking the model with the better fit** while ignoring that its idealizations are unjustified in
  the regime the data occupy.
