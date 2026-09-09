# VIWP.IME developer map

VIWP.IME adds Vietnamese input methods to jQuery.IME.

The supported input methods are:

* VNI
* Telex
* VIQR

All three input methods must share one Vietnamese composition engine. VNI, Telex, and VIQR should differ mainly in how they translate typed keys into semantic commands.

The implementation is intended for upstream contribution to `wikimedia/jquery.ime`, so changes should stay small, conventional, and easy to review.

## Current status

Phase 0 through Phase 3 are complete for the VNI path. The shared engine now has the core orthographic structure needed before adding Telex and VIQR adapters.

Confirmed by Phase 1:

* Vietnamese metadata entries can use ordinary jQuery.IME rule loading.
* `vi-vni`, `vi-telex`, and `vi-viqr` can share one source file: `rules/vi/vi.js`.
* Functional `patterns` rules can call a shared Vietnamese engine.
* Adapter output must include unchanged prefix text because jQuery.IME replaces the complete input window.
* `contextLength` can remain `0` for the current architecture.
* `maxKeyLength` controls the rendered text available before the caret.
* No jQuery.IME core change has been proven necessary.

Implemented by the current Phase 2 slice:

* VNI basic tone input for covered simple vowels.
* VNI tone replacement and tone removal for covered examples.
* VNI circumflex, breve, horn, and `d`/`đ` commands for covered examples.
* Tone preservation when applying a vowel diacritic, such as `á6 -> ấ`.
* Traditional tone placement for initial examples such as `hoa2 -> hòa`.
* Initial `uo7 -> ươ` behavior, such as `tuong7 -> tương`.

Implemented by Phase 3:

* Rime-aware parser structure with `onset`, `rime`, `ending`, checked-ending, and tone-target data.
* Tone placement for common off-glide rimes such as `coi4 -> cõi`, `kheo1 -> khéo`, `thay61 -> thấy`, and `khuay61 -> khuấy`.
* More precise `u`-initial rime handling for cases such as `huo7 -> huơ`, `huop71 -> hướp`, `hướp6 -> huốp`, and `huya1 -> huýa`.
* Explicit multi-vowel marking before repeated-key escape, such as `lo6o62ng -> lôồng`.
* Explicit `qu` and `gi` treatment for examples such as `quoc61 -> quốc` and `gieng61 -> giếng`.
* Checked-ending compatibility for `c`, `ch`, `p`, and `t`, with incompatible tone commands passing through unchanged.
* VNI repeated-key escape for covered tone, vowel-diacritic, and `d`/`đ` commands, including delayed `d`-stroke input such as `dac91 -> đác`.
* Uppercase and mixed-case coverage for the implemented VNI path.

Telex and VIQR are still pass-through scaffolds until their mapping tables and escape behavior are specified.

## Read order

Use these documents as the project specification:

* [`requirements.md`](./requirements.md) – user-visible behavior.
* [`architecture.md`](./architecture.md) – jQuery.IME boundary, adapter contract, and engine structure.
* [`orthographic-model.md`](./orthographic-model.md) – Vietnamese written structure used by the engine.
* [`testing.md`](./testing.md) – unit tests, fixtures, focused commands, and regression workflow.
* [`terminology.md`](./terminology.md) – canonical names for code, tests, and docs.

This README should stay short. Put detailed behavior, architecture, orthographic notes, and test strategy in the owning document above.

## Design guardrails

Keep these constraints intact unless a documented blocker proves otherwise:

* Use one shared Vietnamese engine for VNI, Telex, and VIQR.
* Keep adapters thin: they decode input-method keys and call the engine.
* Keep the engine independent from DOM APIs, jQuery selectors, keyboard events, and caret manipulation.
* Reconstruct composition state from rendered text near the caret where practical.
* Treat tone as semantic; render the visible tone mark through a tone-placement policy.
* Keep vowel diacritics separate from tone marks.
* Distinguish complete states, intermediate states, and unrecognized input.
* Keep structural validity separate from lexical validity.
* Avoid large ordered regex grammars.
* Avoid jQuery.IME core changes unless a focused blocker is demonstrated and documented.

## Roadmap

### Phase 0 – baseline and project spec

Set up the repository, verify the upstream baseline, and define the initial VIWP.IME documentation and agent instructions.

Status: complete.

### Phase 1 – jQuery.IME integration spike

Verify shared rule loading, functional `patterns`, adapter-to-engine calls, focused QUnit workflow, expected upstream files, and jQuery.IME constraints.

Status: complete.

### Phase 2 – shared engine vertical slice with VNI

Build the smallest real path from VNI input to shared-engine transformation to rendered Vietnamese output.

The slice covers Unicode decomposition/composition, a minimal parser, basic semantic transformations, initial traditional tone placement, pure QUnit tests, and representative VNI fixtures.

Status: complete as a vertical slice. Broader Vietnamese correctness belongs to Phase 3.

### Phase 3 – complete shared Vietnamese behavior

Expand the shared engine beyond the initial slice:

* repeated-key escape, beginning with VNI;
* broader flexible command placement;
* fuller tone-placement coverage;
* `qu`;
* `gi`;
* checked-syllable constraints;
* uppercase and mixed-case expansion;
* conservative fallback for unrecognized input.

Status: complete for the VNI path. Broader generated coverage and manual upstream hardening belong to Phase 5.

### Phase 4 – Telex and VIQR adapters

Specify Telex and VIQR mapping tables, then implement them as thin adapters over the shared engine.

This phase should add adapter equivalence tests proving that VNI, Telex, and VIQR produce the same Vietnamese output when they express the same semantic command.

### Phase 5 – coverage, playground, and upstream hardening

Prepare for review:

* broaden generated or data-driven engine coverage;
* add representative integration fixtures for all methods;
* provide a small manual typing playground if useful;
* update user-facing Vietnamese documentation;
* run full regression tests;
* document remaining limitations or upstream issues.

## Current open decisions

Do not guess these while implementing:

* exact Telex mapping and escape behavior;
* exact VIQR mapping, especially punctuation and shifted-key behavior;
* how strict initial structural validation should be;
* whether reformed tone placement appears as separate input methods or a future setting.

## Documentation ownership

Update the smallest document that owns the decision:

* user-visible behavior belongs in `requirements.md`;
* software boundaries belong in `architecture.md`;
* Vietnamese written structure belongs in `orthographic-model.md`;
* test layout and commands belong in `testing.md`;
* names belong in `terminology.md`.

If implementation contradicts the docs, record the discrepancy and resolve it explicitly before continuing.
