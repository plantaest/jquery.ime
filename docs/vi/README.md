# VIWP.IME

VIWP.IME is an effort to add native Vietnamese input methods to [jQuery.IME](https://github.com/wikimedia/jquery.ime).

The project aims to implement Vietnamese text composition through a shared transformation engine, with separate adapters for the major Vietnamese input methods supported by the project.

The initial target input methods are:

* VNI
* Telex
* VIQR

The implementation is intended for upstream contribution to `wikimedia/jquery.ime`.

## Project goals

VIWP.IME has five primary goals.

### 1. Implement Vietnamese input methods for jQuery.IME

The project will implement Vietnamese text composition compatible with the jQuery.IME input-method architecture.

The three target input methods—VNI, Telex, and VIQR—should share the same underlying Vietnamese transformation logic wherever possible.

The input methods should support the expected behaviors of modern Vietnamese typing, including:

* entering Vietnamese tone marks;
* entering Vietnamese vowel diacritics;
* producing `đ` and `Đ`;
* replacing an existing tone;
* removing a tone;
* repeated-key escape behavior where applicable;
* entering tone and vowel-diacritic commands at flexible positions during composition;
* recalculating tone placement when the structure of the syllable changes;
* uppercase and lowercase input.

Detailed behavioral requirements are specified in [`requirements.md`](./requirements.md).

### 2. Document the implementation for developers

The project should provide sufficient technical documentation for future maintainers to understand:

* the Vietnamese orthographic model used by the engine;
* the terminology used in the source code;
* the architecture of the shared transformation engine;
* how VNI, Telex, and VIQR are mapped to semantic operations;
* how Vietnamese composition states are parsed and rendered;
* how tone placement is determined;
* how the implementation is tested.

Developer documentation is written primarily in English to make it suitable for upstream review and maintenance.

### 3. Provide documentation for end users

The completed project should provide user-facing documentation explaining:

* how to enable the Vietnamese input methods;
* how to type Vietnamese using VNI, Telex, and VIQR;
* supported escape and tone-removal behaviors;
* any relevant differences between supported tone-placement variants;
* known limitations, where applicable.

User-facing documentation is expected to be written in Vietnamese first.

This documentation is not part of the initial foundation phase and will be prepared after input-method behavior has stabilized.

### 4. Provide a public testing environment

The project should provide a small browser-based testing environment where users can try the Vietnamese input methods before upstream deployment.

The playground is intended for manual evaluation and community feedback. It is separate from the automated test suite.

It may include several editable controls, such as:

* text inputs;
* text areas;
* content-editable elements.

The playground should remain small and static where possible and should not require a server-side component.

### 5. Submit the implementation upstream

The final implementation is intended to be proposed for inclusion in the upstream jQuery.IME repository.

Development should therefore prefer:

* compatibility with existing jQuery.IME conventions;
* minimal changes outside Vietnamese-specific code;
* a reviewable commit history;
* comprehensive automated tests;
* clear developer documentation;
* avoiding changes to jQuery.IME core unless an actual integration limitation is demonstrated.

## Scope

VIWP.IME is responsible for implementing Vietnamese input behavior inside jQuery.IME.

It does **not** independently define browser, operating-system, mobile-device, or editor compatibility beyond what jQuery.IME itself provides.

Platform-specific behavior remains primarily a responsibility of jQuery.IME and its host applications.

The project currently targets exactly three primary input methods:

* VNI;
* Telex;
* VIQR.

The following are currently outside the intended scope:

* automatic detection of the user's preferred input method;
* VIQR*;
* extended or non-standard Telex variants;
* compatibility with every historical behavior or implementation detail of other Vietnamese input-method software;
* maintaining a separate browser compatibility matrix from jQuery.IME;
* modifying jQuery.IME core solely to add Vietnamese-specific configuration.

## Shared Vietnamese engine

VNI, Telex, and VIQR represent different ways of entering the same Vietnamese orthographic operations.

For example, the command for the acute tone differs between input methods:

```text
VNI:    1
Telex:  s
VIQR:   '
```

These input keys should not require separate implementations of Vietnamese tone placement.

Instead, input-method-specific adapters should translate their keys into shared semantic operations, conceptually similar to:

```text
APPLY_TONE(ACUTE)
```

The shared Vietnamese engine is then responsible for applying that operation to the current composition state.

The same principle applies to:

* other tones;
* circumflex;
* breve;
* horn;
* `d`/`đ`;
* tone removal.

The exact software architecture is described in [`architecture.md`](./architecture.md).

## Orthographic model

VIWP.IME operates primarily on Vietnamese **orthography**, not on a complete phonological analysis of Vietnamese.

The engine needs enough structural information to correctly interpret and transform Vietnamese syllables while the user is typing.

Conceptually, the model distinguishes elements such as:

```text
orthographic syllable
├── onset
└── rime
    ├── nucleus
    └── coda
```

with tone represented separately as a semantic property.

The model must also account for Vietnamese-specific spelling behavior such as:

* `qu`;
* `gi`;
* restrictions associated with checked syllables;
* vowel combinations;
* tone placement;
* incomplete but valid composition states.

A key distinction is made between:

1. a complete Vietnamese orthographic syllable; and
2. an intermediate composition state that may not yet be a complete Vietnamese spelling but can legitimately develop into one through further input.

The orthographic model is specified in [`orthographic-model.md`](./orthographic-model.md).

## Tone placement

The initial default behavior should use the traditional tone-placement convention, for example:

```text
hòa
xóa
hủy
```

The shared engine should, where practical, be designed so that the alternative reformed placement can also be supported, for example:

```text
hoà
xoá
huỷ
```

How an alternative tone-placement policy is exposed through jQuery.IME is an integration concern and is not fixed at this stage.

It may eventually require a separate input-method entry if jQuery.IME does not provide an appropriate per-input-method settings mechanism.

The engine itself should avoid unnecessarily hard-coding a single placement policy if supporting both policies can be achieved cleanly.

## Spelling validation

Strict Vietnamese spelling validation is not an initial implementation priority.

The first priority is to make Vietnamese composition correct and predictable.

However, the architecture should not prevent later addition of conservative validation intended to reduce unwanted transformations in clearly non-Vietnamese input.

Such validation should not require the engine to become a dictionary or lexical spell checker.

The distinction between structurally valid Vietnamese composition and lexical validity should be preserved.

## Implementation principles

The implementation should follow several project-wide principles.

### Prefer semantic transformations

Vietnamese behavior should be implemented in terms of semantic operations such as:

```text
APPLY_TONE
REMOVE_TONE
APPLY_VOWEL_DIACRITIC
APPLY_D_STROKE
```

rather than treating every typing sequence as an independent replacement rule.

### Avoid large ordered regex grammars

Regular expressions may be used where they provide a clear local solution.

However, the Vietnamese orthographic model should not depend on a large ordered collection of overlapping regular-expression rules whose ordering implicitly determines linguistic behavior.

### Keep input methods separate from Vietnamese semantics

VNI, Telex, and VIQR should primarily define how keys map to semantic commands.

They should not independently reimplement parsing, tone placement, or Vietnamese orthographic rules.

### Prefer testable, deterministic logic

Core transformation logic should be structured so that it can be tested independently of browser events and DOM interaction wherever practical.

### Preserve jQuery.IME boundaries

The project should work through the extension mechanisms already provided by jQuery.IME whenever possible.

Changes to jQuery.IME core should be considered only when a concrete integration blocker has been demonstrated.

## Testing strategy

Testing is an integral part of VIWP.IME rather than a final validation step.

The project is expected to use several testing levels:

1. pure unit tests for Vietnamese transformation logic;
2. generated or exhaustive tests for larger classes of valid combinations;
3. jQuery.IME integration fixtures;
4. manual testing through browser-based examples and the public playground;
5. the complete upstream jQuery.IME test suite as a regression gate.

Behavioral changes should be accompanied by appropriate tests.

The detailed strategy is described in [`testing.md`](./testing.md).

## Development phases

Development is expected to proceed approximately through the following phases.

### Phase 0 — Baseline

* fork the upstream repository;
* keep an `upstream` remote connected to `wikimedia/jquery.ime`;
* install dependencies;
* verify the existing test suite;
* create a dedicated VIWP.IME development branch.

### Phase 1 — Foundations

Define:

* terminology;
* behavioral requirements;
* Vietnamese orthographic model;
* architecture;
* testing strategy;
* coding-agent instructions.

No production Vietnamese input implementation is required in this phase.

### Phase 2 — jQuery.IME integration spike

Verify the intended integration approach against the current jQuery.IME architecture.

The spike should determine:

* how the shared Vietnamese engine should be packaged;
* how functional input-method rules should call the engine;
* how code can be shared between VNI, Telex, and VIQR;
* which upstream files must be modified;
* whether any unexpected jQuery.IME constraints exist.

### Phase 3 — Core Vietnamese engine

Implement the foundational transformation model, including:

* Unicode handling;
* parsing;
* semantic operations;
* tone representation;
* tone placement;
* rendering.

### Phase 4 — VNI

Use VNI as the first complete input-method adapter.

VNI is preferred for initial development examples and debugging because it maps input operations explicitly to numeric commands.

### Phase 5 — Composition behavior

Expand the engine to handle:

* flexible command placement;
* intermediate composition states;
* tone replacement;
* tone removal;
* repeated-key escape;
* `qu`;
* `gi`;
* other important orthographic edge cases.

### Phase 6 — Validation and exhaustive testing

Build broader automated coverage from Vietnamese orthographic inventories and invariants.

### Phase 7 — Telex and VIQR

Add Telex and VIQR adapters on top of the shared engine.

The addition of these input methods should require little or no duplication of Vietnamese orthographic logic.

### Phase 8 — Documentation and playground

Prepare:

* developer documentation;
* user documentation;
* public manual-testing environment.

### Phase 9 — Upstream hardening

Perform:

* broader regression testing;
* code cleanup;
* upstream synchronization;
* review of jQuery.IME conventions;
* manual integration checks.

### Phase 10 — Upstream proposal

Prepare and submit the implementation for upstream review.

## Documentation

The developer documentation is organized under this directory.

```text
docs/vi/
├── README.md
├── terminology.md
├── requirements.md
├── orthographic-model.md
├── architecture.md
├── testing.md
└── decisions/
```

The intended responsibilities are:

* [`README.md`](./README.md) — project scope and overview;
* [`terminology.md`](./terminology.md) — canonical terminology used by the project;
* [`requirements.md`](./requirements.md) — required user-visible behavior;
* [`orthographic-model.md`](./orthographic-model.md) — Vietnamese orthographic model used by the engine;
* [`architecture.md`](./architecture.md) — software architecture and integration boundaries;
* [`testing.md`](./testing.md) — test strategy and development test workflow;
* `decisions/` — significant architectural and behavioral decisions when separate decision records are useful.

Some of these documents may evolve during implementation as assumptions are tested against jQuery.IME and real Vietnamese input behavior.

Changes should preserve a clear distinction between:

* requirements;
* linguistic or orthographic modeling;
* software architecture;
* implementation details.

## Current status

The project is currently in **Phase 1 — Foundations**.

The upstream jQuery.IME repository has been forked and cloned, dependencies have been installed, and the baseline upstream test suite has completed successfully before Vietnamese-specific implementation begins.

No production Vietnamese input-method code has been added yet.
