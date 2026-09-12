# VIME testing

This document describes how VIME behavior is tested inside jQuery.IME.

The testing goal is to keep Vietnamese behavior covered without modifying the
generic jQuery.IME rule tests more than necessary.

## File layout

VIME-specific tests live in:

```text
test/jquery.ime.vi.test.js
```

VIME-specific integration fixtures live in:

```text
test/jquery.ime.vi.test.fixtures.js
```

`test/index.html` loads the generic fixture file first, then the VIME fixture
file, then the VIME QUnit test file:

```html
<script src="jquery.ime.test.fixtures.js"></script>
<script src="jquery.ime.vi.test.fixtures.js"></script>
<script src="jquery.ime.vi.test.js"></script>
```

The VIME fixture file appends to the shared `testFixtures` array. The generic
input-method fixture runner in `test/jquery.ime.test.js` then executes those
fixtures through the normal jQuery.IME typing simulation.

## Testing layers

Use the lightest layer that proves the behavior.

### Pure engine tests

Use pure QUnit tests for:

* Unicode parsing and rendering;
* rime recognition;
* structural classification;
* semantic transformations;
* tone placement;
* tone reflow;
* post-transform validation;
* inventory audits.

These tests should call `$.ime.vi` seams directly and should not simulate DOM
typing.

### Adapter-boundary tests

Use adapter tests for:

* command decoding;
* candidate extraction;
* prefix preservation;
* pass-through objects;
* tone-placement policy forwarding;
* VIQR `patterns_shift` bridge behavior;
* adapter calls to `engine.transformCandidate` and `engine.reflowCandidate`.

Adapter tests may use small fake engine objects when the boundary behavior is
the thing being tested.

### Integration fixtures

Use fixture tests for representative full typing sequences in each input
method. Fixtures should cover the user-visible host boundary but should not
become the main place for large grammar inventories.

Good fixture cases include:

* common VNI, Telex, VIQR, and VIQR* typing sequences;
* traditional and reformed tone-placement examples;
* delayed command examples;
* repeated-key escape examples;
* representative structural-validation regressions.

## Current QUnit modules

The current VIME modules are:

```text
VIME – Phase 1 integration spike
VIME – Unicode
VIME – Parser
VIME – Transform
VIME – Tone placement
VIME – Adapter
VIME – Telex adapter
VIME – VIQR adapter
VIME – VIQR* adapter
```

The first module name is historical. It remains as a stable QUnit module name
for registration and loader behavior.

## Focused workflow

Run focused Vietnamese tests with:

```bash
npx grunt connect qunit --modules="VIME – Phase 1 integration spike,VIME – Unicode,VIME – Parser,VIME – Transform,VIME – Tone placement,VIME – Adapter,VIME – Telex adapter,VIME – VIQR adapter,VIME – VIQR* adapter"
```

Run the full relevant repository suite before closing milestones or broad
integration changes:

```bash
npx grunt test
```

If the full suite fails for an unrelated pre-existing reason, keep touched files
clean where possible and record the broader failure in the work summary.

## Behavior coverage

Keep coverage organized by behavior rather than by implementation phase.

### Registration and metadata

Tests should assert that Vietnamese methods are registered with the expected
display labels and metadata:

```text
VNI
Telex
VIQR
VIQR*
VNI (đặt dấu kiểu mới)
Telex (đặt dấu kiểu mới)
VIQR (đặt dấu kiểu mới)
VIQR* (đặt dấu kiểu mới)
```

They should also verify that all methods share the same source and expose the
expected `maxKeyLength`, `contextLength`, and tone-placement policy.

### Parser and recognizer

Parser and recognizer tests should cover:

* NFD input parsing;
* NFC rendering;
* `đ` / `Đ`;
* `qu` and `gi`;
* checked endings;
* complete rimes;
* composition-only rime precursors;
* prefix states;
* unrecognized states.

Inventory audits may use grouped complete rimes from the current Hieu
Thi-based coverage set, but they should remain pure engine tests.

### Semantic transforms

Transform tests should cover:

* applying tones;
* replacing tones;
* removing tones;
* applying circumflex, breve, and horn;
* applying d-stroke;
* repeated-key escape;
* checked-ending tone constraints;
* post-transform validation;
* pass-through for unrecognized candidates.

### Tone placement

Tone-placement tests should cover:

* one-vowel rimes;
* common diphthongs and triphthongs;
* open `oa`, `oe`, and `uy`;
* rimes with endings;
* `qu` and `gi`;
* traditional placement;
* reformed placement.

Representative examples:

```text
traditional: hoa2 -> hòa
reformed:    hoa2 -> hoà
traditional: khoe3 -> khỏe
reformed:    khoe3 -> khoẻ
traditional: huy3 -> hủy
reformed:    huy3 -> huỷ
hoan2 -> hoàn
huynh2 -> huỳnh
```

### Tone reflow

Tone reflow should be tested through both pure engine tests and representative
fixtures:

```text
to1an -> toán
hoa2n -> hoàn
```

Pure engine tests should assert that reflow does not report handled when
rendering would not change the candidate.

### Telex ambiguity

Telex tests should keep paired cases for foreign-like pass-through and nearby
Vietnamese composition:

```text
droid -> droid
david -> david
browser -> browser
nodejs -> nodejs
washington -> washington
dacds -> đác
thayas -> thấy
quocos -> quốc
gienges -> giếng
```

Tests should also cover recognized literal structures:

```text
hoaos -> hoáo
hoeos -> hoéo
thayw -> thayw
huaws -> hứa
```

### VIQR and VIQR*

VIQR-family tests should cover:

* unshifted command keys;
* shifted punctuation through `patterns_shift`;
* backslash escape for covered command keys;
* VIQR* `*` horn behavior;
* delayed d-stroke near rime material;
* reformed tone-placement variants.

## Regression policy

A confirmed bug should get a deterministic regression test. Prefer the smallest
test that reproduces the actual failure.

Do not remove unrelated assertions, skip failing VIME tests, or relax expected
Vietnamese behavior because the current implementation is difficult.

If a test and the specification genuinely disagree, update the relevant doc and
make the behavioral decision explicit.

## Manual smoke testing

Manual testing in `examples/index.html` is useful for typing feel and host
integration. It should be treated as smoke coverage, not as a replacement for
QUnit regressions.

When manual testing finds a bug, add a focused automated regression before
considering it fixed.
