---
name: order-of-magnitude-estimation
description: "Use whenever you need to know the size of an answer and which physics matters before solving — setting characteristic scales, Fermi-decomposing a quantity to within 10^±1, forming dimensionless ratios (Reynolds, Mach, Knudsen, fine-structure α, kT vs level spacing) that rank competing effects, adopting natural/atomic units to strip clutter, or nondimensionalizing an equation to expose its controlling small/large parameter. The scale-reasoning layer: never solve what an estimate already settles."
---

# Order-of-Magnitude Estimation

Before any equation is solved, a physicist knows roughly how big the answer is and which
terms can be dropped. This skill supplies that up-front scale reasoning: characteristic
length/time/energy/velocity, Fermi decomposition, and the dimensionless numbers that decide
which physics dominates. It is the *physical-scale* sibling of `dimensional-analysis` — that
skill owns unit homogeneity, Buckingham π, and error propagation (the bookkeeping); this one
owns what those quantities *mean* about scale, and defers to it for the mechanics.

## Method

1. **Name the characteristic scales.** From the setup extract a natural length $L$, time
   $\tau$, velocity $v$, and energy $E$ — the sizes the system itself sets (mean free path,
   orbital period, thermal energy $kT$, level spacing $\Delta$). Every later ratio and every
   dropped term is judged against these.
2. **Fermi-decompose the target.** Write the unknown as a product of factors each estimable
   to within $10^{\pm1}$, $Q \approx \prod_i f_i$, and multiply. Round each factor to one
   digit; the goal is the exponent, not the mantissa. Report to `config.sig_figs` but claim
   only order-of-magnitude confidence.
3. **Form the ranking dimensionless numbers.** Build the ratios that compare competing
   effects — inertia vs viscosity $Re=\rho vL/\mu$, flow vs sound (Mach), mean-free-path vs
   size (Knudsen), coupling strength $\alpha\approx1/137$, thermal vs quantum $kT/\Delta$.
   Their magnitude *is* the physics selector: $\gg1$ or $\ll1$ tells you which limit you are in.
4. **Adopt natural/atomic units when `config.units=natural`.** Set $\hbar=c=1$ (add $k_B=1$
   for thermal problems, $4\pi\varepsilon_0=1$ for atomic) so a single scale carries the
   dimensions and clutter vanishes. This skill owns that choice and its bookkeeping; keep a
   note of which constants were set to 1.
5. **Nondimensionalize the governing equation.** Rescale each variable by its characteristic
   scale ($x=L\tilde x$, $t=\tau\tilde t$); the equation reorganizes into $\tilde{\mathcal O}$
   plus terms multiplied by dimensionless groups $\epsilon_i$. The small/large $\epsilon$ is
   the controlling parameter — hand it to [[skills/limiting-cases-and-asymptotics/SKILL|limiting-cases-and-asymptotics]].
6. **Decide what to keep.** Drop any term whose dimensionless prefactor is $\lesssim10^{-1}$
   relative to the retained terms, and record the threshold. Keeping everything is not rigor;
   it is a refusal to estimate.
7. **Restore units and cross-check.** Reinsert the constants set to 1 by matching dimensions
   (defer the mechanics to `dimensional-analysis`), then confront the estimate with an
   *independent* route — a second decomposition, a known value, or a bounding limit.

## The rigor standard

- **Scales precede solving.** The characteristic $L,\tau,E$ and the ranking ratios are stated
  before any term is written down or dropped.
- **Every dropped term names its small parameter.** "Negligible" is a claim about a specific
  dimensionless number below a stated threshold, not a hope.
- **Every estimate survives one independent cross-check** — a second Fermi route or a known
  value — agreeing to within an order of magnitude.
- **Natural-unit choices are explicit and reversible:** which constants are 1, and how units
  are restored at the end.
- **Scale reasoning is not unit bookkeeping** — homogeneity, π-groups, and $\sigma$ belong to
  `dimensional-analysis`; cite it rather than rederiving it.

## Checkable output

An **estimation ledger + scale table**: the target with its Fermi decomposition, the
dominant dimensionless numbers that rank the physics, and an independent cross-check; above
it a short SCALES block giving characteristic length/time/energy and the ratios that decide
which effects survive.

```
SCALES
  length L    ~1×10⁻¹⁰ m (Bohr a₀)      energy E   ~10 eV (Rydberg)     time τ ~10⁻¹⁶ s
  ranking #s  α≈1/137 (weak coupling → perturbative)   kT/E≈1/400 @300K (level frozen)

QUANTITY              ESTIMATE      DECOMPOSITION (factors)          DOMINANT #s      CROSS-CHECK
atmospheric scale ht  ~8 km         kT/mg = (4e-21 J)/(4.8e-26·9.8)  —                obs 8.5 km ✓
Reynolds, swimmer     ~1×10⁶        ρvL/μ = 1e3·1·1/1e-3             Re≫1 (inertial)  turbulent wake ✓
H ground-state E      ~14 eV        ½α²m_ec² = ½(1/137)²·511 keV     α≪1 (bound)      Rydberg 13.6 eV ✓
```

Ship only when the scales are named, each dropped term cites a small parameter, and the
cross-check agrees to $10^{\pm1}$. Under the `applied` profile this block is mandatory; under
`pure` it anchors the argument that [[skills/model-building-and-approximation/SKILL|model-building-and-approximation]] then formalizes.

## Anti-patterns

- Solving exactly what a one-line estimate would have settled — or worse, solving before
  knowing whether the answer should be $10^{-9}$ or $10^{9}$.
- Dropping a term "because it's small" without exhibiting the dimensionless number that makes
  it small, or keeping every term to avoid the judgment.
- Quoting a Fermi estimate to three digits as if the mantissa meant something.
- Carrying $\hbar,c,k_B$ through pages of algebra when `config.units=natural` would clear them
  — or setting them to 1 and forgetting to restore units at the end.
- Reaching for the full governing equation before forming the ratio ($Re$, Mach, $kT/\Delta$)
  that already tells you which limit you are in.
- Reproving unit homogeneity or π-groups here instead of deferring to `dimensional-analysis`.
