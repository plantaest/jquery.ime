# VIME testing

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
test/jquery.ime.vi.test.js
test/jquery.ime.vi.test.fixtures.js
```

`test/index.html` loads jQuery, jQuery.IME source files, generic fixture data, Vietnamese fixture data, QUnit, the generic QUnit runner, then Vietnamese-specific QUnit tests.

The full test task is:

```bash
npx grunt test
```

Focused QUnit modules can be run through Grunt. The Phase 1 spike verified this form:

```bash
npx grunt connect qunit --modules="VIME – Phase 1 integration spike"
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

* VNI, Telex, VIQR, and VIQR* command decoding;
* reformed variants using the same adapters with a different tone-placement policy;
* candidate extraction;
* pass-through behavior;
* output shape for functional `patterns`;
* preserving unchanged prefixes in the jQuery.IME input window;
* `maxKeyLength` and `contextLength` assumptions.

The Phase 1 integration tests live in this layer.

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
dac91   -> đác
quoc61  -> quốc
gieng61 -> giếng
hua71   -> hứa
vi-vni-reformed: hoa2 -> hoà
```

Only add examples after the behavior is intentionally implemented.

### Layer 4 – full regression and manual checks

Run the full repository test task before milestones and broad integration changes:

```bash
npx grunt test
```

Use manual browser testing for typing feel, caret behavior, deletion, pasted text, and real editable elements. Manual discoveries should become automated regression tests when practical.

## Recommended test layout

Keep Vietnamese-specific tests outside the generic jQuery.IME test files.

Use:

```text
test/jquery.ime.vi.test.js
```

for pure engine tests and adapter boundary tests.

Use:

```text
test/jquery.ime.vi.test.fixtures.js
```

for representative Vietnamese end-to-end typing fixtures.

Do not add VIME QUnit modules to:

```text
test/jquery.ime.test.js
```

Do not add VIME fixture entries to:

```text
test/jquery.ime.test.fixtures.js
```

This keeps the generic jQuery.IME test runner and fixture corpus easy to compare against.

Recommended module names:

```text
VIME – Unicode
VIME – Parser
VIME – Transform
VIME – Tone placement
VIME – Renderer
VIME – Adapter
VIME – VNI adapter
VIME – Telex adapter
VIME – VIQR adapter
VIME – VIQR* adapter
```

## Fixture layout

Use `test/jquery.ime.vi.test.fixtures.js` for representative Vietnamese end-to-end typing sequences. The file should append Vietnamese fixtures to the existing `testFixtures` array so the generic fixture runner can execute them without Vietnamese-specific changes in `test/jquery.ime.test.js`.

Group fixtures by method and behavior:

```text
Vietnamese VNI – tones
Vietnamese VNI – vowel diacritics
Vietnamese VNI – d-stroke
Vietnamese VNI – flexible composition
Vietnamese VNI – escape
Vietnamese Telex – adapter equivalence
Vietnamese VIQR – adapter equivalence
Vietnamese VIQR* – adapter equivalence
Vietnamese VNI – reformed tone placement
Vietnamese Telex – reformed tone placement
Vietnamese VIQR – reformed tone placement
Vietnamese VIQR* – reformed tone placement
```

Avoid huge generated fixture blocks. Generated coverage belongs in pure tests.

The generic fixture runner reuses one IME instance within each fixture group. It clears the text between cases, but it does not reset the raw `context` buffer. For input methods with nonzero `contextLength`, keep focused adapter tests for context-sensitive behavior and order fixture cases deliberately.

## Focused development workflow

For one engine behavior:

```bash
npx eslint rules/vi/vi.js test/jquery.ime.vi.test.js
npx grunt connect qunit --modules="VIME – Transform"
```

For adapter work:

```bash
npx eslint rules/vi/vi.js test/jquery.ime.vi.test.js test/jquery.ime.vi.test.fixtures.js
npx grunt connect qunit --modules="VIME – Adapter,VIME – Telex adapter,VIME – VIQR adapter,VIME – VIQR* adapter"
```

When adapter work touches `src/jquery.ime.inputmethods.js`, inspect that diff separately and run broader lint when practical. That upstream metadata file may contain unrelated lint failures outside VIME changes.

For tone-placement policy work:

```bash
npx eslint rules/vi/vi.js test/jquery.ime.vi.test.js test/jquery.ime.vi.test.fixtures.js
npx grunt connect qunit --modules="VIME – Tone placement,VIME – Adapter,jquery.ime - input method rules tests"
```

For Vietnamese integration before a commit:

```bash
npx grunt connect qunit --modules="jquery.ime - input method rules tests"
```

This runs the generic fixture module, including Vietnamese fixtures appended by `test/jquery.ime.vi.test.fixtures.js`. If this becomes too broad for the inner loop, first verify whether the current Grunt/QUnit setup supports reliable test-name filtering before adding a separate Vietnamese fixture runner.

If multiple Vietnamese modules are relevant, pass a comma-separated module list as the current Grunt/QUnit integration allows.

For milestone regression:

```bash
npx grunt test
```

Before broad distribution or integration milestones, also run the repository's lint/default command when practical. If full lint reports unrelated pre-existing failures, document that separately and keep touched-file lint clean.

## Phase 2 vertical slice coverage

The Phase 2 VNI vertical slice should keep focused tests for:

```text
decompose/render a, á, à, ă, â
APPLY_TONE(ACUTE) on a
APPLY_TONE(GRAVE) replacing ACUTE
REMOVE_TONE preserving vowel diacritic
APPLY_VOWEL_DIACRITIC(CIRCUMFLEX)
traditional tone placement for one simple multi-letter case
pass-through for unrecognized candidates
```

The representative VNI integration fixture group should include:

```text
a1 -> á
a2 -> à
a6 -> â
á2 -> à
d9 -> đ
```

## Phase 3 VNI coverage

Phase 3 keeps the Phase 2 coverage and adds focused tests for:

```text
repeated-key escape
broader flexible command placement
qu
gi
checked syllables
larger tone-placement inventory
uppercase and mixed-case rendering
tone removal on complex nuclei
```

Representative Phase 3 VNI regression cases:

```text
coi4     -> cõi
kheo1    -> khéo
thay61   -> thấy
thay16   -> thấy
khuay61  -> khuấy
quoc61   -> quốc
gieng61  -> giếng
hoan2    -> hoàn
huy3     -> hủy
huynh2   -> huỳnh
huo7     -> huơ
huop61   -> huốp
huop71   -> hướp
huop617  -> hướp
huop716  -> huốp
to1an    -> toán
hoa2n    -> hoàn
huya1    -> huýa
lo6o62ng -> lôồng
mat1     -> mát
mat5     -> mạt
mat2     -> mat2
a11      -> a1
a66      -> a6
d99      -> d9
dac91    -> đác
dac99    -> dac9
Quoc61   -> Quốc
THAY61   -> THẤY
```

## Phase 4 adapter coverage

Phase 4 keeps the engine coverage in Phase 2 and Phase 3, then adds adapter-focused tests for:

```text
Telex tone keys s f r x j
Telex z tone removal
Telex aa ee oo aw ow uw
Telex delayed a/e/o vowel-diacritic commands after off-glides and codas
Telex delayed w breve and same-base vowel-diacritic switches, with literal behavior after off-glides
Telex ua-family horn behavior
Telex recognized literal rimes such as oao and oeo
Telex uo-family switch after horn and tone
Telex w horn command after an existing candidate
Telex literal standalone w and [ ] safeguards
Telex dd and delayed d-stroke after later rime material
Telex repeated-key escape
Telex checked-ending tone constraints
VIQR tone punctuation keys
VIQR ^, (, +, dd, and 0 commands
VIQR shifted punctuation through patterns_shift
VIQR delayed d-stroke after later rime material
VIQR backslash escape
VIQR* star horn key
```

Representative Phase 4 integration fixtures:

```text
tieengs    -> tiếng
Vieetj     -> Việt
thayas     -> thấy
thayw      -> thayw
thangws    -> thắng
haamw      -> hăm
hoposw     -> hớp
huaws      -> hứa
hoaos      -> hoáo
hoeos      -> hoéo
dduwowngf  -> đường
dacds      -> đác
huopwso    -> huốp
thuongwf   -> thường
mats       -> mát
matj       -> mạt
matf       -> matf
matx       -> matx
quocos     -> quốc
gienges    -> giếng
toansz     -> toan
ass        -> as
ww         -> ww
w          -> w
[          -> [
]          -> ]
tie^'ng    -> tiếng
Vie^.t     -> Việt
ddu+o+`ng  -> đường
dacd'      -> đác
tan\?      -> tan?
Shifted VIQR punctuation sequence -> á à ả ã â ư ă đ
ddu*o*`ng  -> đường
dacd'      -> đác
o\*        -> o*
Shifted VIQR* star sequence -> ư
```

## Phase 5 hardening coverage

Phase 5 starts by adding focused regression tests for current algorithm gaps before broadening coverage.

Covered tone-reflow examples:

```text
to1an -> toán
hoa2n -> hoàn
```

The corresponding pure engine tests should call `engine.reflowCandidate()` directly, while representative input-method fixtures should prove that jQuery.IME invokes the reflow path during ordinary typing.

Covered reformed tone-placement examples:

```text
vi-vni-reformed: hoa2 -> hoà
vi-vni-reformed: khoe3 -> khoẻ
vi-vni-reformed: huy3 -> huỷ
vi-telex-reformed: hoaf -> hoà
vi-viqr-reformed: hoa` -> hoà
vi-viqr-star-reformed: ddu*o*`ng -> đường
```

Reformed fixtures should be representative only. Pure engine tests own the broader policy matrix.

Covered structural-validation examples:

```text
complete rime audit: all current Hieu Thi–based complete rimes -> COMPLETE or COMPLETE_AND_PREFIX

recognizeRime: oao, oeo, iêu, uông, ương, êch -> COMPLETE
recognizeRime: oa, uê -> COMPLETE_AND_PREFIX
recognizeRime: iê, uô, ươ, uâ, uyê -> PREFIX
recognizeRime: eu, ie, ieu, iem, ien, ieng, iec, iet, iep -> COMPOSABLE
recognizeRime: ue, uye, uyen, uyet, enh, ech, uenh, uech -> COMPOSABLE
recognizeRime: ye, yeu, yem, yen, yeng, yet -> COMPOSABLE
recognizeRime: uo, uoi, uou, uom, uon, uong, uoc, uot, uop -> COMPOSABLE
recognizeRime: ưo, ưoi, ưom, ưon, ưong, ưoc, ưot, ưop -> COMPOSABLE
recognizeRime: uan, uang, uat -> COMPOSABLE
recognizeRime: aya, oco -> INVALID

parser: br, bro, davi, droi, node, wa, brow, browse -> UNRECOGNIZED
parser: n, ng, ngh, q, qu, tr -> INTERMEDIATE
parser: ba, thay, gieng, quoc, hoao, hoeo -> STRUCTURALLY_VALID
parser: dieu, tieng, thuong, tuong, Viet, kenh, nghech, huech, huenh -> INTERMEDIATE
parser: diêu, tiêng, tường, kênh, nghêch, huêch, huênh -> STRUCTURALLY_VALID

transform: APPLY_VOWEL_DIACRITIC(breve) on thay -> handled false
transform: APPLY_VOWEL_DIACRITIC(circumflex) on dieu -> diêu
transform: APPLY_VOWEL_DIACRITIC(circumflex) on nghech -> nghêch
transform: tieng -> tiêng, uyen -> uyên, huop -> huôp/hươp preserve composition after recognizer reclassification

vi-vni: d9ieu62  -> điều
vi-vni: nghech61 -> nghếch

vi-telex: droid      -> droid
vi-telex: david      -> david
vi-telex: browser    -> browser
vi-telex: nodejs     -> nodejs
vi-telex: washington -> washington

vi-telex: dacds   -> đác
vi-telex: thayas  -> thấy
vi-telex: quocos  -> quốc
vi-telex: gienges -> giếng
vi-telex: thayw   -> thayw
vi-telex: hoaos   -> hoáo
vi-telex: hoeos   -> hoéo
```

These are paired tests: every guarded foreign-like case should sit near Vietnamese cases that must continue to compose. The runtime implementation must not use the foreign-like examples as a word exception list.

Structural hardening should prefer finite orthographic data and transform-output validation over adapter-local one-off exceptions. For example, `oao` and `oeo` are recognized rimes, while `aya` and `oco` are not recognized rimes.

Representative manual typing smoke tests should run through the functional adapters one key at a time. They cover the examples users are likely to try in `examples/index.html`, while still avoiding the cost of broad DOM fixture duplication.

For simplification work, keep regression tests near the behavior being simplified. For example, Telex `huaw -> hưa`, `aw -> ă`, `cow -> cơ`, `thayw -> thayw`, and `huaws -> hứa` protect the shared `w` decision path after removing the older `ua` adapter precheck.

## Generated tests

Generated or data-driven tests are useful for:

* parse/render round trips;
* tone replacement invariants;
* tone removal invariants;
* traditional tone placement;
* reformed tone placement;
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

* default `contextLength` remains `0` unless a focused test proves raw context is required;
* `maxKeyLength` is large enough for ordinary candidates and command keys;
* adapter output includes unchanged prefix text;
* decomposed Unicode does not silently fall outside the usable window.

If changing either constant, update tests and documentation in the same change.

## Acceptance criteria

The testing strategy is working when:

* pure engine tests can run without DOM input simulation;
* adapter tests prove the jQuery.IME `patterns` contract;
* fixtures prove representative real typing for VNI, Telex, VIQR, and VIQR*;
* generated coverage does not slow the integration suite unnecessarily;
* manual testing can inspect typing feel and caret behavior;
* the complete relevant repository suite passes before milestones.
