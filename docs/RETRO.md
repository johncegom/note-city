# note-city — Retrospective Log

Trigger: a lesson about **process, tooling, or collaboration** — not a product bug
(→ `docs/BUGS.md`) and not a product/design tradeoff (→ `docs/PLAN.md` DR-N) — that would
change how a *different, future* task gets approached.

Generalization test before logging: if this is really just narration of what
happened on one task, it belongs in that task's own row in `docs/LEDGER.md` section 2,
not here.

Format per entry:

```
## RETRO-<NNN>: <short title>

**What went well:** <a pattern worth repeating deliberately>
**What could improve:** <a concrete friction point>
**Advice for next time:** <one or two actionable takeaways>
```

Skim this before starting a new phase or a task type not attempted before.

---

## RETRO-1: check PLAN.md section 1 invariants, not just the task's DoD line

**What went well:** the bug (overlapping notes) was caught by Minh's hands-on test before the task was marked done, and the fix was small because the data model (`Note.start`/`duration`) already supported a clean overlap check.

**What could improve:** P1.5's implementation of "click empty space → add a building" was written straight from the task's DoD line (`hitTest`/`snap*` pure and tested) without checking `docs/PLAN.md` section 1's non-goals ("Chords / harmony. Single melody only — one note at a time"), so the first version silently allowed overlapping notes. No test caught it because no test was written for that invariant — it wasn't in the DoD line, only in the plan's goals section.

**Advice for next time:** when a task adds or edits `Note[]` data (not just drawing/audio), skim `docs/PLAN.md` section 1 (goals/non-goals) and section 4 (data contract) for invariants that apply even when the task's own DoD line doesn't spell them out, and write a test for them before coding — not just for the checkpoint's DoD, but for whether the change agrees with the project's stated rules. Applies directly to P2.4/P2.5/P3.1, which also edit `Note[]`.

## RETRO-2: prove a runtime limit empirically before extending a TDD exemption

**What went well:** P2.3 fired Advise *before* writing code, on the grounds that the decision set the test strategy for the whole transcription layer rather than just one task — exactly the trigger's intent. Advise resolved it by actually installing `@spotify/basic-pitch` in a scratch dir and running it under plain Node, not by re-reading docs.

**What could improve:** the premise going in was wrong. Basic Pitch's README and prose docs show `evaluateModel()` taking a Web Audio `AudioBuffer`, which looked like the same browser-only wall as `resample()` in P2.1 (DR-11). The `.d.ts` actually types it `AudioBuffer | Float32Array` — fully Node-testable. A DR-11-style TDD exemption was nearly granted by analogy, on documentation alone.

**Advice for next time:** DR-11 is a narrow record about `OfflineAudioContext`, not a precedent to reuse whenever a dependency *looks* browser-only. Before exempting anything from TDD for runtime reasons, read the actual type signature and run a throwaway script in the target runtime — an exemption removes a layer from testing for the life of the project, so it needs evidence, not resemblance. Applies to P2.4/P2.5 and any future wrapper over a browser-flavoured library.
