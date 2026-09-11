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
