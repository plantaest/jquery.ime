# AGENTS.md

## Project context

This repository contains VIWP.IME, an effort to add Vietnamese input methods to jQuery.IME.

The target input methods are:

* VNI
* Telex
* VIQR
* VIQR* as a VIQR variant using `*` for horn

All Vietnamese input methods must share one Vietnamese composition engine.

VNI is the preferred method for examples and early implementation work when only one method-specific path is needed.

## Current status

The current branch contains the Phase 5 shared-engine hardening path:

* Vietnamese metadata entries exist for `vi-vni`, `vi-telex`, `vi-viqr`, `vi-viqr-star`, and their `-reformed` tone-placement variants.
* The Vietnamese input methods share one Vietnamese rule source.
* Functional `patterns` rules can call a shared engine boundary.
* VNI has a rime-aware shared-engine path for tones, vowel diacritics, `d`/`đ`, common tone-placement structures, `qu`, `gi`, checked endings, repeated-key escape, and case-preserving output.
* Telex, VIQR, and VIQR* have Phase 4 adapter mappings over the shared engine.
* VIQR and VIQR* support backslash escape for covered command keys.
* VIQR and VIQR* support shifted punctuation command keys through a `patterns_shift` bridge.
* VIQR and VIQR* support delayed d-stroke input such as `dacd' -> đác`.
* Telex supports repeated-key escape for covered tone, vowel-diacritic, and `d`/`đ` commands.
* Telex supports delayed vowel-diacritic commands such as `thayas -> thấy`.
* Telex supports delayed d-stroke input such as `dacds -> đác`.
* Telex supports the covered A-family switch sequence `haamw -> hăm`.
* Telex supports the covered O-family switch sequence `hoposw -> hớp`.
* Telex keeps `w` literal after off-glide candidates such as `thayw`.
* Telex supports the covered `uo`-family switch sequence `huopwso -> huốp`.
* Telex supports the covered `ua`-family horn sequence `huaws -> hứa`.
* Telex keeps final `o` literal in covered rimes such as `hoaos -> hoáo` and `hoeos -> hoéo`.
* Telex leaves standalone `w`, `[`, and `]` as literal input; `w` still works as a horn command when it can transform an existing candidate.
* Phase 5 hardening has started with tone reflow after ordinary letter extension, such as `to1an -> toán` and `hoa2n -> hoàn`.
* Phase 5 also exposes reformed tone-placement variants, such as `vi-vni-reformed`, while keeping traditional placement as the default.
* Phase 5 structural-validation hardening passes through covered foreign-like Telex runs whose candidate structure is impossible as one Vietnamese orthographic syllable, such as `droid`, `david`, `browser`, `nodejs`, and `washington`.
* Phase 5 uses a finite rime recognizer for covered Vietnamese composition states, with separate handling for complete rimes and composition precursors across the covered IÊ/YÊ/UYÊ, UÔ/ƯƠ, UÂ, and e/ê precursor families.
* Phase 5 has pure test audit coverage for the complete rimes in the current Hieu Thi–based composition inventory, plus representative manual typing smoke coverage through the adapters.
* Phase 5 covers additional e/ê precursor gaps, such as `d9ieu62 -> điều` and `nghech61 -> nghếch`.
* Semantic transform output is rejected when the resulting rime is unrecognized, so invalid transformations pass through rather than being rendered.
* Telex delayed-command disambiguation prefers recognized literal structure, so covered rimes such as `oao` and `oeo` no longer need hard-coded adapter exceptions.
* Telex `w` handling relies on shared delayed-command validation plus horn fallback, without a separate `ua` adapter precheck.
* The current Phase 5 boundary is a hardened composition engine for covered behavior, not a spell checker, broad foreign word detector, minority language orthography model, or upstream submission package.

Do not assume broader Vietnamese production behavior exists unless it is present in the current branch and covered by tests. Broader coverage, further recognizer expansion, and engine documentation are still Phase 5 work.

## Required reading

Before changing Vietnamese-specific behavior, architecture, or tests, read:

* `docs/vi/README.md`
* `docs/vi/requirements.md`
* `docs/vi/architecture.md`
* `docs/vi/orthographic-model.md`
* `docs/vi/testing.md`
* `docs/vi/terminology.md`

These documents define the intended project model.

When implementation and documentation disagree, do not silently choose one. Identify the discrepancy, update the right document, and keep the code and tests aligned.

## Revised phase plan

The active plan is:

* Phase 0 – baseline and project specification.
* Phase 1 – jQuery.IME integration spike.
* Phase 2 – shared engine vertical slice with VNI.
* Phase 3 – complete shared Vietnamese behavior for the VNI path.
* Phase 4 – Telex and VIQR adapters.
* Phase 5 – engine hardening and documentation.

The next implementation work should normally be Phase 5: broader coverage, manual typing hardening, further structural-validation tuning, engine simplification where useful, and documentation polish. Playground work and upstream submission preparation are outside the current Phase 5 scope unless the project direction explicitly brings them back.

## Architectural constraints

### Use one shared Vietnamese engine

Do not implement VNI, Telex, and VIQR as three independent Vietnamese transformation systems.

Input-method-specific code should primarily translate input keys into shared semantic commands.

Conceptually:

```text
VNI 1
Telex s
VIQR '
VIQR* '
    ->
APPLY_TONE(ACUTE)
```

Parsing, tone placement, vowel-diacritic handling, Unicode rendering, `qu`, `gi`, and other Vietnamese orthographic logic must be shared.

### Keep the engine host-independent

Core Vietnamese logic should not depend directly on:

* DOM APIs;
* jQuery selectors;
* keyboard events;
* caret manipulation;
* editable-element handling.

jQuery.IME remains responsible for host integration.

The Vietnamese engine should be directly testable without simulating browser input wherever practical.

### Prefer semantic transformations

Represent Vietnamese operations semantically.

Examples:

* applying a tone;
* removing a tone;
* applying a vowel diacritic;
* applying d-stroke.

Do not model Vietnamese behavior primarily as direct character substitutions.

### Avoid large ordered regex grammars

Regular expressions are allowed for small, local tasks.

Do not encode Vietnamese orthographic semantics as a large ordered list of overlapping regex rules whose ordering determines correctness.

If parsing is ambiguous, resolve the ambiguity explicitly through the orthographic model.

### Use rendered text as the main state

Prefer reconstructing the current Vietnamese composition state from rendered text near the caret.

Do not rely on persistent raw-keystroke history unless a specific behavior demonstrably requires it.

jQuery.IME `context` should not become the primary Vietnamese composition state.

### Treat tone semantically

Tone must be modeled independently from the Unicode character that currently carries the visible tone mark.

Do not implement tone relocation as a fundamental semantic operation.

Use this model instead:

```text
parse current structure
-> preserve semantic tone
-> change structure
-> recalculate tone placement
-> render
```

### Distinguish state types

The parser must distinguish:

* complete Vietnamese orthographic syllables;
* valid intermediate composition states;
* unrecognized input.

Do not reject a composition merely because its current surface form is not valid final Vietnamese orthography.

### Keep structural and lexical validity separate

VIWP.IME is not a Vietnamese dictionary or lexical spell checker.

Do not introduce a dictionary dependency merely to determine ordinary Vietnamese composition behavior.

## Terminology

Use the canonical terminology in `docs/vi/terminology.md`.

Important terms:

* use `tone`, not `accent`;
* use `tone mark` for the visible mark;
* use `vowel diacritic` for circumflex, breve, and horn;
* use `nucleus`, `onset`, `rime`, and `ending` according to the project model;
* use `traditional tone placement` and `reformed tone placement`, not `old style` and `new style`.

Do not introduce competing terminology without updating `docs/vi/terminology.md`.

## Tone placement

The initial default policy is:

```text
TRADITIONAL
```

with examples such as:

```text
hòa
xóa
hủy
```

The shared engine supports reformed policy variants where open `oa`, `oe`, and `uy` rimes place tone on the final vowel:

```text
hoà
khoẻ
huỷ
```

Do not hard-code tone-placement policy inside VNI, Telex, VIQR, or VIQR* adapters.

## jQuery.IME core

Avoid modifying jQuery.IME core.

A core change should only be considered when:

1. a concrete Vietnamese requirement cannot be implemented correctly through existing extension mechanisms;
2. the limitation can be demonstrated with a minimal reproducible case;
3. the blocker is documented;
4. project-level design discussion is appropriate before substantial work proceeds.

If a core limitation is discovered, report it rather than immediately working around it with fragile Vietnamese-specific behavior.

## Packaging

The Phase 1 spike confirmed that the smallest jQuery.IME-compatible packaging is one shared Vietnamese rule source:

```text
rules/vi/vi.js
```

with metadata entries for:

```text
vi-vni
vi-telex
vi-viqr
vi-viqr-star
vi-vni-reformed
vi-telex-reformed
vi-viqr-reformed
vi-viqr-star-reformed
```

all pointing to that source.

Keep this packaging until tests or implementation size prove that a split is worth the additional loader complexity.

## Testing rules

Read `docs/vi/testing.md` before changing test infrastructure.

Keep VIWP-specific unit and adapter tests in:

```text
test/jquery.ime.vi.test.js
```

Keep VIWP-specific fixture data in:

```text
test/jquery.ime.vi.test.fixtures.js
```

Do not add Vietnamese-specific QUnit modules or fixture entries to the generic jQuery.IME test files unless a future integration review explicitly asks for that layout.

Use pure engine tests for:

* parser behavior;
* tone transformations;
* vowel-diacritic transformations;
* tone placement;
* Unicode handling;
* rendering;
* validation.

Use jQuery.IME integration fixtures for the host boundary and representative complete typing sequences.

Do not run large grammar corpora through simulated DOM typing when direct engine tests are sufficient.

### Regression tests

A confirmed bug should receive a deterministic automated regression test.

Prefer the smallest test that reproduces the actual failure.

### Preserve repository tests

Before a substantial change is considered complete, run focused Vietnamese tests.

Before milestones or broad integration changes, run the full relevant repository suite:

```bash
npx grunt test
```

If full lint/default tasks fail because of unrelated pre-existing issues, keep touched-file lint clean and document the broader failure.

### Do not weaken tests

Do not:

* remove unrelated assertions;
* skip failing repository tests without explanation;
* relax Vietnamese requirements merely because the current implementation is difficult.

If a test and the specification genuinely disagree, identify the specification issue explicitly and update the relevant doc.

## Implementation workflow

For non-trivial work:

1. read the relevant `docs/vi` files;
2. inspect current jQuery.IME conventions before changing architecture;
3. identify the smallest affected layer;
4. add or update focused tests;
5. implement the behavior;
6. run focused tests;
7. inspect the diff for unrelated changes;
8. run broader regression tests when appropriate.

Do not rewrite unrelated jQuery.IME code while implementing Vietnamese support.

When asked only to analyze or plan, do not modify files.

When asked to implement a scoped task, stay within that scope unless a blocking dependency requires a small additional change.

## Documentation maintenance

Update documentation when an implementation decision changes documented architecture or behavior.

Use:

* `requirements.md` for user-visible behavior;
* `orthographic-model.md` for Vietnamese written structure;
* `architecture.md` for software boundaries;
* `testing.md` for testing strategy and commands;
* `terminology.md` for names.

Do not place major architectural decisions only in source-code comments.

## jQuery.IME integration mindset

Keep the implementation understandable to future jQuery.IME maintainers and VIWP.IME contributors who may not know Vietnamese.

Prefer:

* explicit data structures;
* clear function boundaries;
* readable tests;
* small commits;
* documented behavior;
* minimal core impact.

The implementation should be understandable from code, tests, and documentation without requiring knowledge of historical Vietnamese input-method implementations.
