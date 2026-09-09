# AGENTS.md

## Project context

This repository contains VIWP.IME, an effort to add Vietnamese input methods to jQuery.IME.

The target input methods are:

* VNI
* Telex
* VIQR

All three must share one Vietnamese composition engine.

VNI is the preferred method for examples and early implementation work when only one method-specific path is needed.

## Current status

The current branch contains the Phase 2 shared engine vertical slice:

* Vietnamese metadata entries exist for `vi-vni`, `vi-telex`, and `vi-viqr`.
* The three input methods share one Vietnamese rule source.
* Functional `patterns` rules can call a shared engine boundary.
* VNI has a small real path through the shared engine for basic tones, vowel diacritics, `d`/`đ`, and traditional tone placement examples.
* Telex and VIQR remain pass-through scaffolds until their mapping tables and escape behavior are specified.

Do not assume broader Vietnamese production behavior exists unless it is present in the current branch and covered by tests.

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
* Phase 3 – complete shared Vietnamese behavior.
* Phase 4 – Telex and VIQR adapters.
* Phase 5 – coverage, playground, and upstream hardening.

The next implementation work should normally be Phase 3: expanding the shared engine beyond the initial VNI vertical slice.

## Architectural constraints

### Use one shared Vietnamese engine

Do not implement VNI, Telex, and VIQR as three independent Vietnamese transformation systems.

Input-method-specific code should primarily translate input keys into shared semantic commands.

Conceptually:

```text
VNI 1
Telex s
VIQR '
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

The shared engine should remain capable of supporting the reformed policy where practical.

Do not hard-code tone-placement policy inside VNI, Telex, or VIQR adapters.

## jQuery.IME core

Avoid modifying jQuery.IME core.

A core change should only be considered when:

1. a concrete Vietnamese requirement cannot be implemented correctly through existing extension mechanisms;
2. the limitation can be demonstrated with a minimal reproducible case;
3. the blocker is documented;
4. upstream discussion is appropriate before substantial work proceeds.

If a core limitation is discovered, report it rather than immediately working around it with fragile Vietnamese-specific behavior.

## Packaging

The Phase 1 spike confirmed that the smallest upstream-compatible packaging is one shared Vietnamese rule source:

```text
rules/vi/vi.js
```

with metadata entries for:

```text
vi-vni
vi-telex
vi-viqr
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

Do not add Vietnamese-specific QUnit modules or fixture entries to the upstream generic test files unless an upstream review explicitly asks for that layout.

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

### Preserve upstream tests

Before a substantial change is considered complete, run focused Vietnamese tests.

Before milestones, upstream review, or broad integration changes, run the full relevant repository suite:

```bash
npx grunt test
```

If full lint/default tasks fail because of unrelated pre-existing issues, keep touched-file lint clean and document the broader failure.

### Do not weaken tests

Do not:

* remove unrelated assertions;
* skip failing upstream tests without explanation;
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

## Upstream mindset

Assume the final implementation will be reviewed by jQuery.IME maintainers who may not know Vietnamese.

Prefer:

* explicit data structures;
* clear function boundaries;
* readable tests;
* small commits;
* documented behavior;
* minimal core impact.

The implementation should be understandable from code, tests, and documentation without requiring knowledge of historical Vietnamese input-method implementations.
