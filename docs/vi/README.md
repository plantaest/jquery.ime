# VIWP.IME developer map

VIWP.IME adds Vietnamese input methods to jQuery.IME.

The project supports three input methods:

* VNI
* Telex
* VIQR

They must share one Vietnamese composition engine. VNI, Telex, and VIQR are different ways to request the same Vietnamese orthographic operations; they must not become three separate implementations of Vietnamese tone placement, vowel handling, `qu`, `gi`, or Unicode rendering.

The implementation is intended for upstream contribution to `wikimedia/jquery.ime`, so the preferred shape is small, conventional, and easy to review.

## Current status

The current branch has completed the initial jQuery.IME integration spike.

Confirmed by the spike:

* jQuery.IME can load Vietnamese support through ordinary rule metadata.
* `vi-vni`, `vi-telex`, and `vi-viqr` can point to one shared source file.
* Functional `patterns` rules can call a shared Vietnamese engine.
* The adapter must return output for the complete jQuery.IME input window, not only the changed Vietnamese syllable.
* `contextLength` can remain `0` for the current scaffold.
* `maxKeyLength` controls how much rendered text before the caret is available to the adapter.
* No jQuery.IME core change has been proven necessary so far.

The current Vietnamese source is an integration scaffold, not a production Vietnamese input engine. It registers the target input methods and defines the adapter boundary, but the placeholder engine intentionally does not transform Vietnamese text yet.

## Documentation map

Read these files as one compact specification:

* [`requirements.md`](./requirements.md) describes required user-visible behavior.
* [`architecture.md`](./architecture.md) describes the software boundary between jQuery.IME, adapters, and the shared engine.
* [`orthographic-model.md`](./orthographic-model.md) describes the Vietnamese written structure the engine must understand.
* [`testing.md`](./testing.md) describes how to test the engine and jQuery.IME integration.
* [`terminology.md`](./terminology.md) defines canonical names for code, tests, and documentation.

The docs are intentionally short enough to be reread during implementation. When a question needs a detailed decision, add or update a focused section rather than scattering the answer across multiple files.

## Product scope

VIWP.IME is responsible for Vietnamese input behavior inside jQuery.IME.

It must support:

* tone input, replacement, and removal;
* vowel-diacritic input for circumflex, breve, and horn;
* `d`/`đ` and `D`/`Đ`;
* uppercase and lowercase text;
* flexible command placement during composition;
* repeated-key escape behavior where applicable;
* correct tone placement using the traditional policy by default;
* correct handling of `qu`, `gi`, and ordinary Vietnamese syllable structure;
* valid Unicode output, preferably NFC;
* automated unit and integration tests.

It does not initially target:

* automatic input-method detection;
* VIQR*;
* every extended Telex variant;
* exact compatibility with every historical behavior of UniKey, AVIM, or other Vietnamese IMEs;
* dictionary-based spell checking;
* browser, operating-system, or editor compatibility beyond jQuery.IME itself.

Compatibility with established Vietnamese IMEs matters when deciding typing conventions. It should be verified with explicit examples and tests rather than assumed silently.

## Architectural commitments

The project follows these commitments unless a documented blocker proves that one must change:

* One shared Vietnamese engine serves VNI, Telex, and VIQR.
* Input-method adapters translate keys into semantic commands.
* The engine operates on rendered text near the caret, not on persistent raw keystroke history.
* Tone is represented semantically and rendered according to a tone-placement policy.
* Vowel diacritics are distinct from tone marks.
* Complete syllables, valid intermediate states, and unrecognized input are different classifications.
* Structural validity is separate from lexical validity.
* jQuery.IME remains responsible for events, caret handling, editable elements, loading, and text replacement.
* Vietnamese code should not modify jQuery.IME core unless a minimal reproducible blocker is documented.

## Revised development phases

The old plan had many small phases. The implementation plan is now shorter and tied to reviewable milestones.

### Phase 0 – baseline and project spec

Establish the upstream baseline, install dependencies, verify the existing suite, and define the initial VIWP.IME documentation and agent instructions.

Status: complete.

### Phase 1 – jQuery.IME integration spike

Prove how Vietnamese support plugs into the current repository:

* shared rule loading;
* functional `patterns` contract;
* adapter-to-engine call shape;
* test loading;
* expected upstream files;
* jQuery.IME constraints.

Status: complete in the current scaffold.

### Phase 2 – shared engine vertical slice with VNI

Build the smallest real Vietnamese path through the shared engine, using VNI first.

The vertical slice should include:

* Unicode decomposition/composition helpers;
* a minimal candidate parser;
* semantic tone application;
* semantic vowel-diacritic application;
* rendering with traditional tone placement;
* focused pure QUnit tests;
* a small VNI integration fixture set.

The goal is not to finish all Vietnamese behavior. The goal is to prove the engine API and data model with real output such as `a1 -> á`, `a6 -> â`, and a small number of multi-letter cases.

### Phase 3 – complete shared Vietnamese behavior

Expand the engine until VNI can exercise the important Vietnamese composition model:

* tone replacement;
* tone removal;
* repeated-key escape;
* flexible command placement;
* tone relocation after structural changes;
* uppercase handling;
* `qu`;
* `gi`;
* checked-syllable constraints;
* intermediate-state classification;
* conservative fallback for unrecognized input.

This phase should add tests at the pure engine layer first, then representative jQuery.IME fixtures.

### Phase 4 – Telex and VIQR adapters

Add Telex and VIQR as thin adapters over the same engine.

This phase should primarily define method-specific key decoding and escape behavior. It should not duplicate Vietnamese parsing, tone placement, rendering, or validation.

Adapter equivalence tests should prove that VNI, Telex, and VIQR reach the same semantic output when they express the same operation.

### Phase 5 – coverage, playground, and upstream hardening

Prepare the implementation for real review:

* broaden generated or data-driven engine coverage;
* add representative integration fixtures for all methods;
* provide a small manual typing playground if useful;
* update user-facing Vietnamese documentation;
* run full regression tests;
* inspect diffs for unrelated changes;
* document any remaining limitations or upstream issues.

## Next recommended work

The next implementation step is revised Phase 2: a small VNI vertical slice through the shared engine.

Start with the lowest useful layer:

1. define the engine result contract in tests;
2. implement Unicode helpers for Vietnamese vowel/tone decomposition and NFC rendering;
3. implement a minimal parser for one-letter and simple multi-letter candidates;
4. implement `APPLY_TONE` and `APPLY_VOWEL_DIACRITIC`;
5. connect the current adapter to the real engine;
6. add a small VNI fixture group.

Do not begin by adding a large regex table or by implementing VNI, Telex, and VIQR separately.

## Updating the docs

Update the smallest document that owns the decision:

* user-visible behavior belongs in `requirements.md`;
* software boundaries belong in `architecture.md`;
* Vietnamese written structure belongs in `orthographic-model.md`;
* tests and commands belong in `testing.md`;
* naming belongs in `terminology.md`.

If implementation contradicts these docs, record the discrepancy and resolve it explicitly before continuing.
