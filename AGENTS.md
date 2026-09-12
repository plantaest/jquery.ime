# AGENTS.md

## Project context

This repository contains VIME, the Vietnamese Input Method Engine being
developed inside jQuery.IME.

The supported Vietnamese input methods are:

* VNI;
* Telex;
* VIQR;
* VIQR* as a VIQR variant using `*` for horn.

All Vietnamese input methods must share one Vietnamese composition engine.
VNI remains the preferred method for examples and early method-specific work
when only one path is needed.

## Required reading

Before changing Vietnamese-specific behavior, architecture, tests, or
documentation, read:

* `docs/vi/README.md`
* `docs/vi/status.md`
* `docs/vi/requirements.md`
* `docs/vi/architecture.md`
* `docs/vi/algorithm.md`
* `docs/vi/orthographic-model.md`
* `docs/vi/testing.md`
* `docs/vi/terminology.md`

These documents define the intended project model. When implementation and
documentation disagree, do not silently choose one. Identify the discrepancy,
update the right document, and keep code, tests, and docs aligned.

## Source-of-truth map

Use the docs by ownership:

* `README.md` for the short project map.
* `status.md` for phase history, current boundary, known limits, and deferred
  work.
* `requirements.md` for user-visible behavior.
* `architecture.md` for software boundaries, packaging, and jQuery.IME
  integration.
* `algorithm.md` for the current engine flow.
* `orthographic-model.md` for Vietnamese written structure.
* `testing.md` for test layout and commands.
* `terminology.md` for canonical vocabulary.

Do not place major architectural decisions only in source comments.

## Core architectural constraints

Use one shared Vietnamese engine. Do not implement VNI, Telex, VIQR, and VIQR*
as independent transformation systems.

Input-method-specific code should primarily translate input keys into shared
semantic commands:

```text
VNI 1
Telex s
VIQR '
VIQR* '
    -> apply tone acute
```

The shared engine owns Vietnamese parsing, structural validation, tone
placement, vowel-diacritic behavior, `qu`, `gi`, Unicode rendering, and
post-transform validation.

Keep the engine host-independent. Core Vietnamese logic must not depend on DOM
APIs, jQuery selectors, keyboard events, caret manipulation, or editable
elements.

Use rendered text near the caret as the main composition state. Do not rely on
persistent raw-key history unless a specific behavior demonstrably requires it
and has focused tests.

Treat tone semantically. Do not implement tone relocation as a fundamental
operation. Parse the current structure, preserve the semantic tone, update the
structure, recalculate tone placement, then render.

Distinguish:

* recognized complete composition structures;
* valid intermediate composition states;
* unrecognized input.

Keep structural and lexical validity separate. VIME is not a dictionary or
lexical spell checker.

## jQuery.IME integration constraints

Avoid modifying jQuery.IME core. A core change should only be considered when:

1. a concrete Vietnamese requirement cannot be implemented correctly through
   existing extension mechanisms;
2. the limitation can be demonstrated with a minimal reproducible case;
3. the blocker is documented;
4. project-level design discussion is appropriate before substantial work
   proceeds.

The current jQuery.IME-compatible package is one shared Vietnamese rule source:

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

Keep this packaging until tests or implementation size prove that a split is
worth the additional loader complexity.

## Testing rules

Keep VIME-specific unit and adapter tests in:

```text
test/jquery.ime.vi.test.js
```

Keep VIME-specific fixture data in:

```text
test/jquery.ime.vi.test.fixtures.js
```

Use pure engine tests for parser behavior, transformations, validation, tone
placement, Unicode handling, rendering, and recognizer inventory audits.

Use jQuery.IME integration fixtures for the host boundary and representative
complete typing sequences. Do not run large grammar corpora through simulated
DOM typing when direct engine tests are sufficient.

A confirmed bug should receive a deterministic automated regression test. Prefer
the smallest test that reproduces the actual failure.

Before a substantial change is considered complete, run focused Vietnamese
tests:

```bash
npx grunt connect qunit --modules="VIME – Phase 1 integration spike,VIME – Unicode,VIME – Parser,VIME – Transform,VIME – Tone placement,VIME – Adapter,VIME – Telex adapter,VIME – VIQR adapter,VIME – VIQR* adapter"
```

Before milestones or broad integration changes, run the full relevant
repository suite:

```bash
npx grunt test
```

If the full suite fails because of unrelated pre-existing issues, keep
touched-file checks clean and document the broader failure.

Do not weaken tests, skip failing repository tests, or relax Vietnamese
requirements merely because the current implementation is difficult.

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

When asked only to analyze or plan, do not modify files.

When asked to implement a scoped task, stay within that scope unless a blocking
dependency requires a small additional change.

## Terminology

Use the canonical terms in `docs/vi/terminology.md`.

Important terms:

* use `tone`, not `accent`;
* use `tone mark` for the visible mark;
* use `vowel diacritic` for circumflex, breve, and horn;
* use `nucleus`, `onset`, `rime`, and `ending` according to the project model;
* use `traditional tone placement` and `reformed tone placement`, not `old
  style` and `new style`.

Do not introduce competing terminology without updating `docs/vi/terminology.md`.

## Documentation maintenance

Update documentation when an implementation decision changes documented
architecture or behavior.

Do not duplicate large feature inventories across docs. Put current project
status in `status.md`, user-visible rules in `requirements.md`, algorithmic
flow in `algorithm.md`, and software boundaries in `architecture.md`.

## Integration mindset

Keep the implementation understandable to future jQuery.IME maintainers and
VIME contributors who may not know Vietnamese.

Prefer:

* explicit data structures;
* clear function boundaries;
* readable tests;
* small commits;
* documented behavior;
* minimal jQuery.IME core impact.
