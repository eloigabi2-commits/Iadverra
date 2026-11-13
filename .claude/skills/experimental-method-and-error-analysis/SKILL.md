---
name: experimental-method-and-error-analysis
description: "Use whenever a claim rests on measured data — reporting a lab result, fitting a model to points, comparing theory against experiment, or reviewing someone's number. Enforces the discipline of the bench: a measurement model, statistical vs systematic errors combined honestly, calibrated systematics, a least-squares/χ² fit with reduced χ²≈1, and theory–data agreement stated as an nσ discrepancy against the combined error. Emits a measurement & error ledger; a number without stat and sys errors is not a measurement."
---

# Experimental Method & Error Analysis

The discipline that turns a reading on a dial into a defensible number with an honest error
bar. A result is not "measured" because an instrument displayed it — it is measured when the
chain from raw signal to reported value is modeled, its statistical and systematic errors are
separated and bounded, and its distance from theory is stated in units of its own uncertainty.

## Method

1. **Write the measurement model.** State what is *directly* measured (a time, a voltage, a
   count) versus what is *inferred*, and the explicit chain $Y=f(x_1,\dots,x_n)$ linking them.
   Every $x_i$ needs its own error; the model is what makes the budget auditable.
2. **Separate statistical from systematic.** Statistical error is the scatter of repeated
   measurement — it shrinks as $\sigma_{\bar x}=\sigma/\sqrt N$ with repetition. Systematic
   error is a shared bias (offset, gain, drift, background) that repetition does *not* average
   away; it must be bounded by calibration and method, never by taking more data. Carry the two
   as separate columns, $\sigma_{stat}$ and $\sigma_{sys}$.
3. **Calibrate and bound the systematics.** For each systematic — zero offset, gain/scale,
   time or thermal drift, background/dark rate — either correct it against a reference standard
   or bound its residual. A systematic you cannot correct becomes a $\sigma_{sys}$ contribution;
   an uncalibrated instrument yields no measurement.
4. **Design the error budget, then propagate.** Rank the inputs by contribution and identify
   the *dominant* term — effort goes where the budget is largest, not where measuring is easy.
   The propagation mechanics (partial-derivative quadrature $\sigma_f^2=\sum_i(\partial f/\partial x_i)^2\sigma_i^2$,
   relative-error rules, covariance) are owned by `dimensional-analysis` — defer to it; this
   skill owns *which inputs enter and why*.
5. **Fit by least squares / $\chi^2$.** For a model with $p$ parameters over $N$ points,
   minimize $\chi^2=\sum_i (y_i-f(x_i))^2/\sigma_i^2$ over $\nu=N-p$ degrees of freedom. The
   reduced $\chi^2_\nu=\chi^2/\nu$ is the goodness signal: $\approx1$ is a good fit; $\gg1$ means
   the model underfits *or* the errors are underestimated; $\ll1$ means the errors are
   overestimated (or overfitting). Report $\chi^2/\mathrm{dof}$, not just the parameters.
6. **State theory–data agreement as $n\sigma$.** Never eyeball "close." Compute
   $n=|Y_{meas}-Y_{theory}|/\sigma_{comb}$ where $\sigma_{comb}=\sqrt{\sigma_{stat}^2+\sigma_{sys}^2}$
   (stat $\oplus$ sys). The hypothesis-test machinery for what $n$ means lives in
   `probability-and-statistics` — defer to it; report the number and its verdict.
7. **Fix sig-figs to the uncertainty, then guard against bias.** The last significant digit of
   $Y$ sits at the place of $\sigma_{comb}$ (`config.sig_figs` caps display, the error sets the
   floor). Pre-register cuts and, where a "right answer" is anticipated, blind the analysis so
   the expected value cannot steer the choices — confirmation bias is a systematic too.

## The rigor standard

- **A number is "measured $X=\dots$" only with three parts:** $\sigma_{stat}$, $\sigma_{sys}$,
  and a stated agreement level. Any one missing and it is a reading, not a measurement.
- **Statistical and systematic errors are never merged before their sources are stated** — they
  combine differently and one cannot be beaten down by more data.
- **Every fit reports $\chi^2/\mathrm{dof}$ and its degrees of freedom**; a fit without a
  goodness statistic is a drawn curve, not a test.
- **Agreement is a computed $n\sigma$ against the combined error**, with the sign of any tension
  noted — not "consistent within errors" by inspection.
- **The calibration behind each systematic is named** (reference, method, or bound); "estimated"
  is not a calibration.

## Checkable output

End with a **measurement & error ledger** the reviewer can rerun. Columns: the quantity; its
value with separate stat and sys errors, units and sig-figs; the method and calibration; the fit
goodness; and the theory–data distance in $\sigma$.

```
QUANTITY   VALUE ± σ_stat ± σ_sys (units, s.f.)   METHOD / CALIBRATION            FIT (χ²/dof)   THEORY–DATA (nσ)
g          9.79 ± 0.02 ± 0.05 m/s² (3 s.f.)       pendulum, timing-gate calib.    1.1            0.2σ from 9.81 ✓
τ (decay)  2.197 ± 0.004 ± 0.003 µs (4 s.f.)      counter, dead-time corrected    0.9            0.8σ from 2.197 ✓
R (resist) 100.4 ± 0.1 ± 0.6 Ω (4 s.f.)           4-wire, lead+drift bounded      3.4 ⚠          4σ — underfit/σ low ✗
```

The `⚠`/`✗` row shows a failing fit ($\chi^2_\nu\gg1$ with a $4\sigma$ tension): the errors are
underestimated or the model is wrong — resolve before shipping. This ledger is **mandatory under
both `pure` and `applied` profiles** for any empirical claim; under `pure` it grounds a theory's
one contact with data, under `applied` it is the deliverable.

## Anti-patterns

- Reporting a bare mean with no error, or a single $\sigma$ that silently mixes stat and sys.
- "Taking more data" to shrink a *systematic* — repetition kills $1/\sqrt N$ scatter only, never bias.
- Quoting $\chi^2_\nu\approx1$ as success while the error bars were inflated to make it so ($\ll1$ hidden).
- Declaring theory and data "agree" by eye, or dividing by $\sigma_{stat}$ alone instead of $\sigma_{comb}$.
- Sig-figs unhitched from the uncertainty — $9.79312$ m/s² beside a $\pm0.05$ error.
- Choosing cuts after seeing the answer (un-blinded, un-pre-registered) so the expected value steers the result.

See also `dimensional-analysis` and `probability-and-statistics` (propagation and hypothesis-test
mechanics), [[skills/model-building-and-approximation/SKILL|model-building-and-approximation]] for
what the fit is testing, and [[skills/limiting-cases-and-asymptotics/SKILL|limiting-cases-and-asymptotics]]
for checking the theory value before comparison. Fit and propagate with the configured CAS
(`config.cas`: sympy|sage|none).
