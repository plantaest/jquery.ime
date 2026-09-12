# VIME status

This document records the current project status and phase history. It is the
place for milestone state, known limits, and deferred work. Normative behavior
belongs in `requirements.md`; the current engine algorithm belongs in
`algorithm.md`.

## Current milestone

Phase 5 – engine hardening and documentation is complete for the initial
jQuery.IME-hosted VIME stage.

This means:

* the current shared engine has a stable tested baseline for VNI, Telex, VIQR,
  VIQR*, and their reformed tone-placement variants;
* the finite rime recognizer is used for covered structural validation;
* tone reflow, post-transform validation, repeated-key escape, and Telex
  delayed-command disambiguation are documented and tested for the current
  scope;
* the project has enough documentation for a contributor to understand the
  current algorithm without reverse-engineering `rules/vi/vi.js` from scratch.

It does not mean VIME is a dictionary-backed Vietnamese spell checker or a
complete model of every Vietnamese-related orthography.

## Implemented input methods

The current jQuery.IME source registers:

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

All eight input-method ids load the same source file:

```text
rules/vi/vi.js
```

The `-reformed` variants change only tone-placement policy. They do not fork
the parser, transformer, renderer, or adapter logic.

## Phase history

### Phase 0 – baseline and project specification

The project established the goal: add Vietnamese input methods to jQuery.IME
through one shared Vietnamese composition engine.

### Phase 1 – jQuery.IME integration spike

The spike confirmed the viable jQuery.IME extension path:

* input methods are registered from rule files through metadata in
  `src/jquery.ime.inputmethods.js`;
* functional `patterns` rules can call a shared engine boundary;
* `patterns_shift` needs an array bridge for shifted VIQR punctuation;
* `maxKeyLength` provides the rendered input window;
* `contextLength` should not become the main Vietnamese composition state;
* one shared Vietnamese source file is the smallest compatible package.

### Phase 2 – shared engine vertical slice with VNI

Phase 2 proved the shared-engine boundary with a VNI vertical slice, including
candidate extraction, semantic commands, parsing, rendering, and focused QUnit
coverage.

### Phase 3 – complete VNI path for the initial scope

Phase 3 expanded the shared engine for the VNI path:

* tones and tone removal;
* vowel diacritics;
* d-stroke;
* `qu` and `gi` handling;
* checked-ending behavior;
* case-preserving rendering;
* common complex rimes and family transitions.

### Phase 4 – Telex and VIQR adapters

Phase 4 added the remaining adapters over the shared engine:

* Telex command decoding and repeated-key escape;
* VIQR command decoding and backslash escape;
* VIQR* horn mapping;
* shifted VIQR punctuation bridge;
* adapter fixtures for all input methods.

### Phase 5 – engine hardening and documentation

Phase 5 hardened the shared engine and documented the current algorithm:

* finite rime recognizer with complete, composable, and prefix statuses;
* post-transform structural validation;
* tone reflow after ordinary letter extension;
* traditional and reformed tone-placement variants;
* foreign-like Telex pass-through for structurally impossible candidates;
* recognized-literal disambiguation for Telex delayed commands;
* inventory audit tests and regression fixtures;
* documentation ownership split across README, requirements, architecture,
  orthographic model, algorithm, testing, terminology, and status.

## Current boundary

The current boundary is a hardened composition engine for covered modern
Vietnamese typing behavior in jQuery.IME.

The engine is not:

* a dictionary;
* a broad foreign-word detector;
* a minority-language orthography model;
* a historical spelling model;
* a standalone npm package;
* an upstream submission package.

Those may become future project directions, but they are outside this initial
Phase 5 closure.

## Known limitations

The recognizer validates written structure, not lexical existence. A
Vietnamese-shaped nonce syllable can still be accepted if its structure is in
the covered model.

Rare, dialectal, minority-language, historical, and specialized spellings may
need new structural examples and tests before the recognizer should accept them.

Some Telex ambiguity remains inherent in a rendered-text-first jQuery.IME
adapter. VIME currently prefers documented structural behavior and
repeated-key escape rather than a persistent raw-key history or a user-visible
spell-check option.

The current implementation is intentionally packaged as one jQuery.IME rule
file. A later standalone VIME package could split source files once loader and
distribution constraints are different.

## Deferred work

Future work may include:

* a standalone VIME package outside the jQuery.IME tree;
* broader rime inventory review with additional external references;
* deeper manual typing smoke coverage in real host surfaces;
* optional source split once packaging changes justify it;
* source simplification around tone-target and vowel-transition internals;
* upstream submission preparation if the project direction returns to that path.

These are not required to close the current jQuery.IME-hosted Phase 5.

## Verification commands

Focused Vietnamese tests:

```bash
npx grunt connect qunit --modules="VIME – Phase 1 integration spike,VIME – Unicode,VIME – Parser,VIME – Transform,VIME – Tone placement,VIME – Adapter,VIME – Telex adapter,VIME – VIQR adapter,VIME – VIQR* adapter"
```

Full repository suite:

```bash
npx grunt test
```
