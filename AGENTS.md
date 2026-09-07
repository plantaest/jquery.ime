# AGENTS.md

## Project context

This repository contains VIWP.IME, an effort to add Vietnamese input methods to jQuery.IME.

The target input methods are:

* VNI
* Telex
* VIQR

All three input methods should share one Vietnamese composition engine.

VNI is the preferred input method for examples and implementation discussion when only one method-specific example is needed.

## Project status

VIWP.IME is currently being developed on top of the existing jQuery.IME repository.

The upstream jQuery.IME test suite was green before Vietnamese-specific implementation began.

Do not assume that Vietnamese production code already exists unless it is present in the current branch.

## Required reading

Before changing Vietnamese-specific behavior or architecture, read:

* `docs/vi/README.md`
* `docs/vi/terminology.md`
* `docs/vi/requirements.md`
* `docs/vi/orthographic-model.md`
* `docs/vi/architecture.md`
* `docs/vi/testing.md`

These documents define the intended project model.

When implementation and documentation disagree, do not silently choose one. Identify the discrepancy and resolve it explicitly.

## Architectural constraints

### Use one shared Vietnamese engine

Do not implement VNI, Telex, and VIQR as three independent Vietnamese transformation systems.

Input-method-specific code should primarily translate input keys into shared semantic commands.

Conceptually:

```text
VNI 1
Telex s
VIQR '
    ↓
APPLY_TONE(ACUTE)
```

Parsing, tone placement, vowel-diacritic handling, Unicode rendering, `qu`, `gi`, and other Vietnamese orthographic logic should be shared.

### Keep the Vietnamese engine independent from jQuery.IME where practical

Core Vietnamese logic should not depend directly on:

* DOM APIs;
* jQuery selectors;
* keyboard events;
* caret manipulation;
* editable-element handling.

jQuery.IME should remain responsible for host integration.

The Vietnamese engine should be directly testable without simulating browser input where practical.

### Prefer semantic transformations

Represent Vietnamese operations semantically.

Examples include:

* applying a tone;
* removing a tone;
* applying a vowel diacritic;
* applying d-stroke.

Do not model Vietnamese behavior primarily as direct character substitutions.

### Do not build a large ordered regex grammar

Regular expressions are allowed for small, local tasks.

Do not encode Vietnamese orthographic semantics as a large ordered list of overlapping regex rules whose ordering determines correctness.

If parsing is ambiguous, resolve the ambiguity explicitly through the orthographic model.

### Rendered text is the primary source of truth

Prefer reconstructing the current Vietnamese composition state from the rendered text near the caret.

Do not rely on a persistent raw-keystroke history unless a specific behavior demonstrably requires it.

jQuery.IME `context` should not become the primary Vietnamese composition state.

### Tone is semantic

Tone must be modeled independently from the Unicode character that currently carries the visible tone mark.

Do not implement tone relocation as a fundamental semantic operation.

Instead:

```text
parse current structure
→ preserve semantic tone
→ change structure
→ recalculate tone placement
→ render
```

### Distinguish complete and intermediate states

The parser must be able to distinguish:

* complete Vietnamese orthographic syllables;
* valid intermediate composition states;
* unrecognized input.

Do not reject a composition merely because its current surface form is not valid final Vietnamese orthography.

### Keep structural validity separate from lexical validity

VIWP.IME is not a Vietnamese dictionary or lexical spell checker.

Do not introduce a dictionary dependency merely to determine ordinary Vietnamese composition behavior.

## Vietnamese terminology

Use the canonical terminology defined in:

`docs/vi/terminology.md`

In particular:

* use `tone`, not `accent`;
* use `tone mark` for the visible mark;
* use `vowel diacritic` for circumflex, breve, and horn;
* use `nucleus`, `onset`, `rime`, and `coda` according to the project model;
* use `traditional tone placement` and `reformed tone placement`, not `old style` and `new style`.

Do not introduce new competing terminology without updating the terminology document.

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

Do not modify core code merely to make Vietnamese implementation easier.

A core change should only be considered when:

1. a concrete Vietnamese requirement cannot be implemented correctly through existing extension mechanisms;
2. the limitation can be demonstrated with a minimal reproducible case;
3. the blocker is documented;
4. upstream discussion is appropriate before substantial work proceeds.

If a core limitation is discovered, report it rather than immediately working around it with fragile Vietnamese-specific behavior.

## Packaging

The exact source-file layout of the shared Vietnamese engine is not frozen yet.

Before introducing a final packaging structure, inspect:

* current jQuery.IME rule-loading conventions;
* dependency/reuse mechanisms;
* build behavior;
* test loading;
* upstream style.

Prefer the smallest upstream-compatible structure that preserves the shared-engine boundary.

## Testing rules

Read `docs/vi/testing.md` before changing test infrastructure.

### Test at the lowest useful layer

Use pure engine tests for:

* parser behavior;
* tone transformations;
* vowel-diacritic transformations;
* tone placement;
* Unicode handling;
* rendering;
* validation.

Use jQuery.IME integration fixtures for the host boundary and complete typing sequences.

Do not run large grammar corpora through simulated DOM typing when direct engine tests are sufficient.

### Write regression tests

A confirmed bug should receive a deterministic automated regression test.

Prefer the smallest test that reproduces the actual failure.

### Preserve upstream tests

Before considering a substantial change complete, relevant Vietnamese tests must pass.

Before a major push, milestone, or upstream review, run the complete upstream suite:

```bash
npx grunt --force
```

The full suite is a regression gate, not necessarily the inner development loop.

### Do not weaken tests to make code pass

Do not:

* remove unrelated assertions;
* skip failing upstream tests without explanation;
* relax Vietnamese requirements merely because the current implementation is difficult.

If a test and the specification genuinely disagree, identify the specification issue explicitly.

## Implementation workflow

For non-trivial tasks:

1. read the relevant project documentation;
2. inspect the existing jQuery.IME implementation;
3. identify the smallest affected architectural layer;
4. add or update tests;
5. implement the behavior;
6. run focused tests;
7. inspect the diff for unrelated changes;
8. run broader regression tests when appropriate.

Do not rewrite unrelated jQuery.IME code while implementing Vietnamese support.

## Documentation maintenance

Update documentation when an implementation decision changes the documented architecture or behavior.

Use:

* `requirements.md` for user-visible behavior;
* `orthographic-model.md` for Vietnamese structural rules;
* `architecture.md` for software boundaries;
* `testing.md` for testing strategy.

Do not place major architectural decisions only in source-code comments.

For significant decisions with multiple plausible alternatives, consider adding a record under:

```text
docs/vi/decisions/
```

## Coding-agent behavior

When a requirement is unclear:

* inspect the project documentation first;
* inspect existing jQuery.IME conventions;
* do not invent Vietnamese orthographic rules;
* do not assume behavior from another Vietnamese IME unless the task explicitly asks for compatibility research;
* report unresolved ambiguity when it affects correctness.

When asked only to analyze or plan, do not modify files.

When asked to implement a scoped task, stay within that scope unless a blocking dependency requires a small additional change.

## Upstream mindset

Assume that the final implementation will be reviewed by jQuery.IME maintainers who may not know Vietnamese.

Prefer:

* explicit data structures;
* clear function boundaries;
* readable tests;
* small commits;
* documented behavior;
* minimal core impact.

The implementation should be understandable from the code and project documentation without requiring knowledge of historical Vietnamese input-method implementations.
