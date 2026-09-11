# VIWP.IME developer map

VIWP.IME adds Vietnamese input methods to jQuery.IME.

The supported input methods are:

* VNI
* Telex
* VIQR
* VIQR* as a VIQR variant using `*` for horn

All Vietnamese input methods must share one Vietnamese composition engine. VNI, Telex, VIQR, and VIQR* should differ mainly in how they translate typed keys into semantic commands.

The current implementation also exposes reformed tone-placement variants for each input method.

The implementation should remain compatible with the current jQuery.IME architecture, so changes should stay small, conventional, and easy to review.

## Current status

Phase 0 through Phase 4 are complete for the current integration path. The shared engine now supports the covered Vietnamese composition behavior, and VNI, Telex, VIQR, and VIQR* all call that shared engine through jQuery.IME functional `patterns`.

Confirmed by Phase 1:

* Vietnamese metadata entries can use ordinary jQuery.IME rule loading.
* `vi-vni`, `vi-telex`, `vi-viqr`, `vi-viqr-star`, and their `-reformed` variants can share one source file: `rules/vi/vi.js`.
* Functional `patterns` rules can call a shared Vietnamese engine.
* Adapter output must include unchanged prefix text because jQuery.IME replaces the complete input window.
* `contextLength` can remain `0` for all current Vietnamese input methods.
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

Implemented by Phase 4:

* Telex tone keys `s`, `f`, `r`, `x`, `j`, and tone removal key `z`.
* Telex vowel-diacritic keys `aa`, `ee`, `oo`, `aw`, `ow`, and `uw`, plus `w` as a horn command for an existing candidate.
* Telex delayed vowel-diacritic commands such as `thayas -> thấy`, `thangws -> thắng`, and `thuongwf -> thường`.
* Telex supports covered same-base vowel-diacritic switch sequences such as `haamw -> hăm` and `hoposw -> hớp`.
* Telex keeps `w` literal after off-glide candidates such as `thayw`, and supports the covered `uo`-family switch sequence `huopwso -> huốp`.
* Telex supports the covered `ua`-family horn sequence `huaws -> hứa`.
* Telex keeps final `o` literal in covered rimes such as `hoaos -> hoáo` and `hoeos -> hoéo`.
* Telex `dd` and delayed d-stroke input such as `dacds -> đác`.
* Telex repeated-key escape for covered tone, vowel-diacritic, and `d`/`đ` commands.
* Telex leaves standalone `w`, `[`, and `]` as literal input.
* VIQR tone keys, vowel-diacritic keys, `dd`, `0` tone removal, and backslash escape.
* VIQR and VIQR* shifted punctuation command keys through a `patterns_shift` bridge.
* VIQR and VIQR* delayed d-stroke input such as `dacd' -> đác`.
* VIQR* as a separate input method that reuses VIQR behavior but uses `*` instead of `+` for horn.

Started in Phase 5:

* Tone reflow after ordinary letter extension for covered VNI examples, such as `to1an -> toán` and `hoa2n -> hoàn`.
* Reformed tone-placement variants for VNI, Telex, VIQR, and VIQR*, such as `vi-vni-reformed`.
* Structural-validation hardening for covered foreign-like Telex runs whose written structure is impossible as one Vietnamese orthographic syllable, such as `droid`, `david`, `browser`, `nodejs`, and `washington`.
* A finite rime recognizer for covered Vietnamese composition states, with separate handling for complete rimes and composition precursors across the covered IÊ/YÊ/UYÊ, UÔ/ƯƠ, UÂ, and e/ê precursor families.
* Pure test audit coverage for the complete rimes in the current Hieu Thi–based composition inventory, plus representative manual typing smoke coverage through the adapters.
* Additional e/ê precursor coverage for examples such as `d9ieu62 -> điều` and `nghech61 -> nghếch`.
* Transform output validation so a semantic command that would create an unrecognized rime passes through instead.
* Telex delayed-command disambiguation based on recognized literal structure rather than hard-coded `oao` and `oeo` exceptions.
* Telex `w` handling now relies on shared delayed-command validation plus horn fallback, rather than a separate `ua` adapter precheck.

## Current implementation boundary

The current Phase 5 target is a hardened Vietnamese composition engine for the covered VNI, Telex, VIQR, VIQR*, and reformed variants. It is appropriate for focused manual evaluation in `examples/index.html` and for iterating toward a stable VIWP.IME implementation.

It is not a Vietnamese spell checker, dictionary, broad foreign word detector, minority language orthography model, or upstream submission package. Those directions require separate decisions and tests.

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

* Use one shared Vietnamese engine for VNI, Telex, VIQR, and VIQR*.
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

Set up the repository, verify the jQuery.IME baseline, and define the initial VIWP.IME documentation and agent instructions.

Status: complete.

### Phase 1 – jQuery.IME integration spike

Verify shared rule loading, functional `patterns`, adapter-to-engine calls, focused QUnit workflow, expected integration files, and jQuery.IME constraints.

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

Status: complete for the VNI path. Broader coverage, structural-validation hardening, and engine documentation belong to Phase 5.

### Phase 4 – Telex and VIQR adapters

Specify Telex and VIQR mapping tables, then implement them as thin adapters over the shared engine.

This phase adds adapter equivalence tests proving that VNI, Telex, VIQR, and VIQR* produce the same Vietnamese output when they express the same semantic command.

Status: complete for the fixed Phase 4 mapping tables.

### Phase 5 – engine hardening and documentation

Stabilize the current algorithm:

* broaden generated or data-driven pure-engine coverage;
* add broader representative integration fixtures for all methods;
* harden structural validation for accidental transformations in foreign-like text;
* expand and simplify the finite rime recognizer where tests show gaps;
* harden tone reflow after a toned candidate is extended by ordinary letters;
* keep traditional and reformed tone-placement policies covered by pure engine and representative adapter tests;
* simplify parser, transformer, renderer, or adapter code where tests show the behavior is stable enough to clarify;
* document the parse/apply/render algorithm and remaining known limitations;
* keep manual typing checks focused on the existing examples page;
* run full regression tests before milestones.

Playground work and upstream submission preparation are outside the current Phase 5 scope unless the project direction explicitly brings them back.

## Documentation ownership

Update the smallest document that owns the decision:

* user-visible behavior belongs in `requirements.md`;
* software boundaries belong in `architecture.md`;
* Vietnamese written structure belongs in `orthographic-model.md`;
* test layout and commands belong in `testing.md`;
* names belong in `terminology.md`.

If implementation contradicts the docs, record the discrepancy and resolve it explicitly before continuing.
