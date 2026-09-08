# VIWP.IME testing

This document defines how Vietnamese input behavior should be tested in the current jQuery.IME repository.

Testing should answer two separate questions:

```text
Does the shared Vietnamese engine perform the correct transformation?
Does jQuery.IME call the adapter and replace text correctly?
```

Do not answer both questions only through simulated browser typing. Most Vietnamese behavior belongs in pure engine tests.

## Current test infrastructure

The current repository uses:

```text
Grunt
QUnit
test/index.html
test/jquery.ime.test.js
test/jquery.ime.test.fixtures.js
```

`test/index.html` loads jQuery, jQuery.IME source files, fixture data, QUnit, then `test/jquery.ime.test.js`.

The full test task is:

```bash
npx grunt test
```

Focused QUnit modules can be run through Grunt. The Phase 1 spike verified this form:

```bash
npx grunt connect qunit --modules="VIWP.IME – Phase 1 integration spike"
```

Use the current module name when the tests are renamed.

## Testing layers

Use four layers.

### Layer 1 – pure engine unit tests

Pure tests cover Vietnamese logic without DOM events:

* Unicode helpers;
* tone and vowel-diacritic decomposition;
* candidate parsing;
* complete/intermediate/unrecognized classification;
* semantic transformations;
* tone placement;
* rendering;
* structural validation.

These tests should be fast and numerous. They are the main place for edge cases.

### Layer 2 – adapter unit tests

Adapter tests verify the jQuery.IME-facing boundary without simulating editable elements:

* VNI, Telex, and VIQR command decoding;
* candidate extraction;
* pass-through behavior;
* output shape for functional `patterns`;
* preserving unchanged prefixes in the jQuery.IME input window;
* `maxKeyLength` and `contextLength` assumptions.

The current Phase 1 scaffold tests are in this layer.

### Layer 3 – jQuery.IME integration fixtures

Fixtures verify complete typing through jQuery.IME:

* raw key sequence;
* input method id;
* expected rendered output;
* ordinary input and representative `contenteditable` coverage.

Use fixtures to prove integration, not to duplicate the entire engine corpus.

Good fixture candidates:

```text
a1      -> á
a11     -> a1
tuong72 -> tường
hoa2    -> hòa
d9      -> đ
quoc61  -> quốc
gieng61 -> giếng
```

Only add examples after the behavior is intentionally implemented.

### Layer 4 – full regression and manual checks

Run the full repository test task before milestones and upstream review:

```bash
npx grunt test
```

Use manual browser testing for typing feel, caret behavior, deletion, pasted text, and real editable elements. Manual discoveries should become automated regression tests when practical.

## Recommended test layout

Short term, keep Vietnamese tests in `test/jquery.ime.test.js` under clearly named QUnit modules. This avoids changing the test loader before the suite is large.

Recommended module names:

```text
VIWP.IME – Unicode
VIWP.IME – Parser
VIWP.IME – Transform
VIWP.IME – Tone placement
VIWP.IME – Renderer
VIWP.IME – Adapter
VIWP.IME – VNI integration
VIWP.IME – Telex integration
VIWP.IME – VIQR integration
```

When Vietnamese tests become large, add a separate file:

```text
test/jquery.ime.vi.test.js
```

and load it from:

```text
test/index.html
```

Do this only when it improves readability enough to justify the extra upstream diff.

## Fixture layout

Use `test/jquery.ime.test.fixtures.js` for representative end-to-end typing sequences.

Group fixtures by method and behavior:

```text
Vietnamese VNI – tones
Vietnamese VNI – vowel diacritics
Vietnamese VNI – d-stroke
Vietnamese VNI – flexible composition
Vietnamese VNI – escape
Vietnamese Telex – adapter equivalence
Vietnamese VIQR – adapter equivalence
```

Avoid huge generated fixture blocks. Generated coverage belongs in pure tests.

## Focused development workflow

For one engine behavior:

```bash
npx eslint rules/vi/vi.js test/jquery.ime.test.js
npx grunt connect qunit --modules="VIWP.IME – Transform"
```

For adapter work:

```bash
npx eslint rules/vi/vi.js test/jquery.ime.test.js src/jquery.ime.inputmethods.js
npx grunt connect qunit --modules="VIWP.IME – Adapter"
```

For Vietnamese integration before a commit:

```bash
npx grunt connect qunit --modules="VIWP.IME – VNI integration"
```

If multiple Vietnamese modules are relevant, pass a comma-separated module list as the current Grunt/QUnit integration allows.

For milestone regression:

```bash
npx grunt test
```

Before upstream review, also run the repository's lint/default command expected by current upstream CI. If full lint reports unrelated pre-existing failures, document that separately and keep touched-file lint clean.

## What to test first in revised Phase 2

The next implementation phase should start with a VNI vertical slice.

Write pure tests first for:

```text
decompose/render a, á, à, ă, â
APPLY_TONE(ACUTE) on a
APPLY_TONE(GRAVE) replacing ACUTE
REMOVE_TONE preserving vowel diacritic
APPLY_VOWEL_DIACRITIC(CIRCUMFLEX)
traditional tone placement for one simple multi-letter case
pass-through for unrecognized candidates
```

Then add a small VNI integration fixture group proving jQuery.IME calls the adapter correctly:

```text
a1 -> á
a2 -> à
a6 -> â
á2 -> à
d9 -> đ
```

Do not add broad Telex or VIQR fixtures before their mapping tables are explicitly fixed.

## Generated tests

Generated or data-driven tests are useful for:

* parse/render round trips;
* tone replacement invariants;
* tone removal invariants;
* traditional tone placement;
* equivalent composition orders;
* uppercase/lowercase pairs;
* Unicode normalization pairs.

Keep generated tests at the pure engine layer. Do not run thousands of cases through simulated DOM typing unless a specific integration issue requires it.

## Regression tests

Every confirmed bug should receive the smallest deterministic regression test that proves the failure.

Choose the lowest useful layer:

* parser bug: parser unit test;
* tone-placement bug: tone-placement or render unit test;
* adapter bug: adapter unit test;
* jQuery.IME replacement bug: integration fixture;
* caret or browser behavior: manual case first, then fixture if practical.

Do not weaken existing tests to make implementation pass. If a test and the specification disagree, update the specification only after making the discrepancy explicit.

## `maxKeyLength` and `contextLength` tests

Tests must protect the assumptions from `architecture.md`:

* `contextLength` remains `0` unless a focused test proves raw context is required;
* `maxKeyLength` is large enough for ordinary candidates and command keys;
* adapter output includes unchanged prefix text;
* decomposed Unicode does not silently fall outside the usable window.

If changing either constant, update tests and documentation in the same change.

## Acceptance criteria

The testing strategy is working when:

* pure engine tests can run without DOM input simulation;
* adapter tests prove the jQuery.IME `patterns` contract;
* fixtures prove representative real typing for VNI, Telex, and VIQR;
* generated coverage does not slow the integration suite unnecessarily;
* manual testing can inspect typing feel and caret behavior;
* the complete relevant upstream suite passes before review.
