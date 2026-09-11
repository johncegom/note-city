# note-city — Bug Log

Trigger: something in the product is already wrong — a real defect (including one
inherited from a dependency, e.g. Basic Pitch, that got faithfully carried over).

Logging a bug here is **not** fixing it. Wait for an explicit decision (recorded in
the entry's Status line) before applying a fix — unless the bug is actively
dangerous (data loss, security), in which case flag it to Minh immediately in
addition to logging it here.

Format per entry:

```
## BUG-<NNN>: <short symptom>

**Symptom:** <what's observed>
**Root cause:** <known cause, or explicitly "unknown">
**Reachability:** <real path hit during normal use, vs. only a test built to hit it>
**Options:** <if there's an obvious fix, list options; omit otherwise>
**Status:** pending decision / decided: <what> / fixed in <commit/task ID>
```

---

No bugs logged yet.
