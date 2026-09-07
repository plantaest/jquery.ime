# VIWP.IME Testing Strategy

This document defines the testing strategy and development test workflow for VIWP.IME.

Testing is treated as part of the architecture rather than as a final validation step.

Vietnamese input composition has a relatively small structural domain but a large number of possible:

* syllable structures;
* tone combinations;
* typing orders;
* intermediate states;
* input-method mappings;
* escape sequences;
* Unicode representations;
* integration contexts.

A reliable implementation therefore requires several complementary testing levels.

The behavioral requirements are defined in [`requirements.md`](./requirements.md).

The Vietnamese domain model is defined in [`orthographic-model.md`](./orthographic-model.md).

The software boundaries that these tests exercise are defined in [`architecture.md`](./architecture.md).

---

# 1. Testing goals

The VIWP.IME test system should provide confidence that:

* Vietnamese orthographic parsing is correct;
* complete and intermediate states are distinguished correctly;
* semantic commands transform composition states correctly;
* tone is preserved independently from its rendered position;
* tone placement is correct;
* vowel diacritics are handled correctly;
* Unicode input and output remain valid;
* equivalent typing orders converge where required;
* VNI, Telex, and VIQR share the same Vietnamese semantics;
* repeated-key escape behaves predictably;
* `qu` and `gi` are handled correctly;
* checked-syllable constraints are represented correctly;
* jQuery.IME integration produces the same behavior as the pure engine;
* existing jQuery.IME input methods are not regressed.

---

# 2. Testing principles

## 2.1 Test behavior before implementation

When adding or changing stable Vietnamese behavior, tests should normally be written before or together with the implementation.

For jQuery.IME integration rules, this follows the existing upstream convention of adding or updating fixtures before implementing the corresponding rule behavior.

A bug fix should normally begin with a failing regression test.

---

## 2.2 Test at the lowest useful layer

A behavior should be tested at the lowest architectural layer that fully expresses it.

For example:

```text
tone replacement
```

should primarily be tested against the pure transformation engine.

It should not require simulated DOM keypresses merely to prove that:

```text
GRAVE + APPLY_TONE(ACUTE)
→ ACUTE
```

DOM-level tests should verify the jQuery.IME integration boundary rather than duplicate the entire orthographic test corpus.

---

## 2.3 Integration tests do not replace unit tests

A fixture such as:

```text
tuong72 → tường
```

is useful because it proves that the complete jQuery.IME input path works.

However, by itself it does not reveal whether a failure originates in:

* VNI command decoding;
* candidate extraction;
* parsing;
* vowel-diacritic transformation;
* tone representation;
* tone placement;
* rendering;
* jQuery.IME replacement behavior.

Pure tests should isolate these responsibilities.

---

## 2.4 Manual testing does not replace automated testing

Manual typing is useful for evaluating:

* typing feel;
* unexpected composition sequences;
* caret behavior;
* interaction with actual editable elements;
* exploratory edge cases.

A behavior discovered manually should become an automated regression test when practical.

---

## 2.5 The full upstream suite is a regression gate

The complete jQuery.IME suite does not need to run after every small edit.

It must, however, remain an authoritative regression gate before:

* important pushes;
* milestones;
* upstream review;
* final pull-request submission.

---

# 3. Testing layers

VIWP.IME uses five complementary testing layers:

```text
Level 1
Pure unit tests

        ↓

Level 2
Generated and invariant tests

        ↓

Level 3
jQuery.IME integration fixtures

        ↓

Level 4
Manual browser testing

        ↓

Level 5
Full upstream regression suite
```

Each level answers a different question.

---

# 4. Level 1 — Pure unit tests

Pure unit tests verify the shared Vietnamese engine without simulated keyboard events or DOM interaction.

These tests should cover logical modules such as:

```text
Unicode utilities
orthographic parser
composition classifier
semantic transformations
tone placement
renderer
validator
candidate extraction
```

where the final implementation exposes suitable testable boundaries.

---

# 5. Parser tests

Parser tests should verify that surface text produces the expected semantic structure.

Conceptual examples:

```text
parse("tường")
```

should recognize information equivalent to:

```text
onset: t

nucleus:
    ươ

ending:
    ng

tone:
    GRAVE

state:
    COMPLETE
```

Similarly:

```text
parse("quốc")
```

should recognize:

```text
onset:
    qu

nucleus:
    ô

ending:
    c

tone:
    ACUTE
```

without treating the `u` of `qu` as an independent tone-bearing vowel.

---

# 6. Intermediate-state tests

The parser must also be tested against composition states that are useful to an input method but are not canonical final Vietnamese spellings.

Examples include ASCII-like precursor states used during VNI composition.

A test should distinguish:

```text
COMPLETE
```

from:

```text
INTERMEDIATE
```

and:

```text
UNRECOGNIZED
```

where the implementation uses equivalent categories.

Intermediate-state coverage is essential to flexible command placement.

---

# 7. Unicode decomposition tests

Unicode tests should verify that Vietnamese semantic properties can be recovered correctly from supported surface representations.

Test categories should include:

* plain base vowels;
* circumflex vowels;
* breve vowels;
* horn vowels;
* each of the five tone marks;
* combinations of vowel diacritic and tone;
* uppercase equivalents;
* canonically equivalent input where supported.

Conceptual assertions include:

```text
decode("ấ")
→ base vowel: a
→ vowel diacritic: CIRCUMFLEX
→ tone: ACUTE
```

and:

```text
decode("ừ")
→ base vowel: u
→ vowel diacritic: HORN
→ tone: GRAVE
```

---

# 8. Unicode normalization tests

If the implementation accepts both NFC and decomposed canonical input, tests should verify that canonically equivalent forms produce equivalent semantic states.

A useful invariant is conceptually:

```text
parse(NFC(x))
==
parse(NFD(x))
```

for supported Vietnamese strings.

Final rendered output should also be checked against the project's chosen normalization policy, normally NFC.

---

# 9. Tone transformation tests

Every semantic tone operation should be tested independently.

For a suitable candidate:

```text
APPLY_TONE(ACUTE)
APPLY_TONE(GRAVE)
APPLY_TONE(HOOK)
APPLY_TONE(TILDE)
APPLY_TONE(DOT)
REMOVE_TONE
```

should be covered.

Tone replacement must receive explicit tests.

For example:

```text
á + APPLY_TONE(GRAVE)
→ à
```

and:

```text
tường + APPLY_TONE(ACUTE)
→ tướng
```

should preserve all non-tone structure.

---

# 10. Tone-removal tests

Tone removal must be tested separately from general diacritic removal.

For example:

```text
tường
+
REMOVE_TONE
→
tương
```

must preserve:

```text
ươ
```

Similarly:

```text
ấ
+
REMOVE_TONE
→
â
```

must preserve the circumflex.

---

# 11. Vowel-diacritic transformation tests

Each vowel-diacritic operation should be tested independently.

Categories include:

```text
CIRCUMFLEX
BREVE
HORN
```

Basic conceptual cases include:

```text
a + CIRCUMFLEX → â
e + CIRCUMFLEX → ê
o + CIRCUMFLEX → ô

a + BREVE → ă

o + HORN → ơ
u + HORN → ư
```

These tests should also verify preservation of an existing tone.

For example:

```text
á + CIRCUMFLEX
→ ấ
```

not:

```text
â
```

---

# 12. D-stroke tests

The `d-stroke` operation should be tested independently from vowel and tone handling.

Examples:

```text
d → đ
D → Đ
```

Repeated or escape behavior should have separate tests once its semantics are finalized.

---

# 13. Tone-placement tests

Tone placement should be extensively unit-tested because it is independent from tone transformation itself.

Tests should cover:

* simple nuclei;
* complex nucleus families;
* open rimes;
* consonantal endings;
* off-glides;
* vowel diacritics;
* `qu`;
* `gi`;
* traditional placement;
* reformed placement.

---

# 14. Traditional tone-placement tests

The default traditional policy must include representative cases such as:

```text
hòa
xóa
khỏe
lóe
hủy
thủy
```

and structures with endings where the ordinary nucleus target applies:

```text
hoàn
toán
ngoạn
```

Tests should demonstrate that tone placement depends on parsed structure rather than a simple substring rule such as:

```text
oa → first vowel
```

---

# 15. Reformed tone-placement tests

If the shared engine supports the reformed policy, the same semantic states should be rendered under the alternative policy.

Examples:

```text
hòa ↔ hoà
xóa ↔ xoá
khỏe ↔ khoẻ
hủy ↔ huỷ
```

The test should ideally operate on the same parsed semantic state with only the rendering policy changed.

This proves that tone-placement policy is not embedded in the parser or input-method adapter.

---

# 16. `qu` tests

`qu` must receive a dedicated test group.

Representative structures should include:

```text
qua
quá
quý
quốc
quên
quyền
```

Tests should verify that:

* `qu` is parsed according to the project model;
* its `u` is not accidentally selected as the tone target;
* subsequent rime parsing remains correct;
* VNI/Telex/VIQR all eventually use the same semantic behavior.

---

# 17. `gi` tests

`gi` must also receive a dedicated test group.

Representative structures should include forms such as:

```text
gia
giá
gì
giữ
giếng
giết
```

Tests should focus on:

* surface overlap involving `i`;
* correct rime recognition;
* correct tone target;
* no duplicated `i`;
* correct transformation from intermediate states.

Because `gi` is one of the most structurally unusual cases, every bug found here should normally receive a regression test.

---

# 18. Checked-syllable tests

Syllables ending in:

```text
-p
-t
-c
-ch
```

should be tested against the structural tone constraint:

```text
ACUTE
DOT
```

Tests should distinguish:

```text
structural classification
```

from:

```text
user-visible behavior for an incompatible command
```

until the latter is fully specified.

For example, a validator test may assert that:

```text
ending = c
tone = ACUTE
```

is tone-compatible while:

```text
ending = c
tone = GRAVE
```

is not.

---

# 19. Case tests

The engine should have representative tests for:

```text
lowercase
Title-like capitalization
UPPERCASE
mixed case
```

Examples include:

```text
a1 → á
A1 → Á

d9 → đ
D9 → Đ
```

Grammar data should not need duplicated uppercase inventories merely to pass these tests.

---

# 20. Level 2 — Generated tests

Generated tests exercise large finite portions of the Vietnamese orthographic domain without manually writing every assertion.

This level is particularly important for VIWP.IME because many relationships can be represented through finite grammar data.

---

# 21. Why generated tests matter

A small collection of familiar Vietnamese words can easily miss structural holes.

For example, manually testing:

```text
tường
tiếng
quốc
hòa
```

does not prove that:

* every supported nucleus works;
* every permitted ending is handled;
* every tone target is correct;
* every uppercase equivalent works;
* all parser-renderer combinations remain consistent.

Generated coverage provides much stronger confidence.

---

# 22. Grammar-derived tests

Where orthographic grammar is represented declaratively, tests should be generated from that data where practical.

Possible dimensions include:

```text
onset
×
medial
×
nucleus
×
ending
×
tone
```

Only structurally supported combinations should be generated for final-state tests.

Intermediate grammar may generate its own test classes separately.

---

# 23. Parse–render round-trip invariant

One of the strongest engine invariants should be conceptually:

```text
render(parse(x))
==
canonicalize(x)
```

for canonical supported Vietnamese syllables.

If final output is NFC, this may effectively mean:

```text
render(parse(x))
==
NFC(x)
```

subject to the selected tone-placement policy.

Round-trip failures can expose mismatches between parser and renderer immediately.

---

# 24. Semantic round-trip invariant

A stronger form may compare semantic state:

```text
parse(render(state))
==
canonicalizeState(state)
```

for representable semantic states.

This is useful when several surface representations may be canonically equivalent.

---

# 25. Tone replacement invariant

For any structurally tone-compatible state:

```text
applyTone(
    applyTone(state, toneA),
    toneB
)
```

should have:

```text
tone == toneB
```

and should preserve unrelated structure.

No previous tone should survive.

---

# 26. Tone-removal invariant

For any state with a tone:

```text
removeTone(state)
```

should preserve:

```text
onset
rime structure
vowel diacritics
case
```

while producing:

```text
tone = NONE
```

---

# 27. Tone-placement independence invariant

For a semantic state whose spelling differs only by tone-placement policy:

```text
render(state, TRADITIONAL)
```

and:

```text
render(state, REFORMED)
```

must parse back into equivalent semantic state.

The visible position of the tone mark may differ.

The semantic tone must not.

---

# 28. Composition-order convergence

One of the most important generated test classes concerns equivalent input orders.

Where two input sequences are defined to represent the same composition, they should converge.

Conceptually:

```text
vowel-diacritic command
then tone command
```

and:

```text
tone command
then vowel-diacritic command
```

should produce equivalent final state where both orders are valid.

Using VNI notation conceptually:

```text
...72
```

and:

```text
...27
```

should converge for the corresponding composition class.

This property should eventually be generated across many supported nuclei and endings rather than demonstrated by only one example.

---

# 29. Input-method equivalence tests

Once VNI, Telex, and VIQR exist, equivalent semantic input should produce equivalent output.

Conceptually:

```text
VNI sequence
Telex sequence
VIQR sequence
       ↓
same semantic commands
       ↓
same Vietnamese output
```

These tests are especially useful for detecting accidental Vietnamese logic inside one adapter.

---

# 30. Generated corpus size

Large generated test corpora should run primarily against pure engine functions.

They should **not** be executed through a browser DOM simulation for every structural combination.

For example:

```text
tens of thousands of engine assertions
```

may be reasonable.

The same number of simulated jQuery.IME keypress sequences would unnecessarily slow the upstream suite.

---

# 31. Use of external syllable inventories

Computational inventories such as the Hiếu Thi rime and syllable data may be used as:

```text
coverage resources
```

and:

```text
test-generation inputs
```

after the project's own grammar assumptions are verified.

They must not silently become normative lexical whitelists.

A generated candidate being absent from a dictionary is not automatically a test failure.

Likewise, a candidate appearing in an exploratory generated inventory does not automatically prove that it is canonical Vietnamese orthography.

---

# 32. Level 3 — jQuery.IME integration fixtures

The upstream jQuery.IME repository includes a QUnit-based fixture framework for input methods.

VIWP.IME must use this framework for end-to-end input sequences.

Conceptually, a fixture contains:

```javascript
{
    description: 'Vietnamese VNI tests',
    inputmethod: '...',
    tests: [
        {
            input: '...',
            output: '...',
            description: '...'
        }
    ]
}
```

The exact identifiers will be determined during integration.

---

# 33. Fixture-first workflow

When adding or changing an externally visible jQuery.IME input behavior, the corresponding integration fixture should normally be added before or together with the implementation.

This follows the existing upstream testing convention.

A regression bug should be reproduced by a fixture when the bug concerns the full input-method integration path.

---

# 34. Integration test responsibilities

Integration fixtures should verify:

* input method registration;
* input method loading;
* method-specific command decoding;
* calls into the shared engine;
* replacement text returned to jQuery.IME;
* complete typing sequences;
* relevant editable-element behavior.

They should not contain exhaustive duplicates of every pure-engine orthographic combination.

---

# 35. Default editable-element coverage

The existing jQuery.IME fixture framework runs ordinary fixtures against an input element and, when no explicit `inputType` is supplied, runs the same fixture against a `contenteditable` element as well.

VIWP.IME should take advantage of this default behavior where appropriate.

This provides useful integration coverage without manually duplicating every fixture block.

Specific `textarea` tests may be added where behavior genuinely differs or where a regression requires it.

---

# 36. Core VNI integration fixture groups

VNI should be the first complete integration fixture set.

At minimum, it should include representative examples for:

```text
basic tones 1–5
tone replacement
tone removal with 0

circumflex with 6
horn with 7
breve with 8

d-stroke with 9

tone before vowel diacritic
vowel diacritic before tone

command before coda completion
command after coda completion

tone relocation through rerendering

repeated-key escape

uppercase

qu
gi

checked syllables
traditional tone placement
```

---

# 37. Avoid enormous fixture blocks

Integration fixtures should remain readable.

If one block becomes too large, tests should be grouped by behavior rather than placed into a single monolithic Vietnamese fixture.

Possible groups include:

```text
Vietnamese VNI — basic tones

Vietnamese VNI — vowel diacritics

Vietnamese VNI — flexible composition

Vietnamese VNI — escape behavior

Vietnamese VNI — qu and gi
```

The exact fixture organization should follow upstream style after Phase 2 reconnaissance.

---

# 38. Telex integration fixtures

Telex fixtures should focus on:

* Telex command mapping;
* Telex-specific repeated-key behavior;
* ambiguous literal letters;
* integration with the shared engine.

They should not copy the complete VNI corpus merely with different raw strings unless cross-method equivalence coverage justifies it.

Shared engine behavior belongs primarily in pure tests.

---

# 39. VIQR integration fixtures

VIQR fixtures should similarly focus on:

* VIQR punctuation commands;
* literal punctuation escape behavior;
* integration with the shared engine.

Particular attention should be paid to ambiguity between:

```text
Vietnamese command punctuation
```

and:

```text
literal punctuation
```

where relevant.

---

# 40. Level 4 — Manual browser testing

Manual testing should use the actual jQuery.IME implementation.

Two environments are useful during development:

```text
test/index.html
```

for inspecting QUnit results, and:

```text
examples/index.html
```

or the future VIWP.IME playground for actual typing.

These environments serve different purposes.

---

# 41. QUnit browser runner

The browser QUnit runner is useful for:

* viewing individual failures;
* filtering tests;
* rerunning tests interactively;
* inspecting assertion descriptions;
* working on a focused test area without reading a large terminal log.

It should be part of the ordinary development workflow.

The exact recommended filtering URL or command should be recorded after Vietnamese test names are finalized.

---

# 42. Manual typing environment

Manual typing should use an editable demo rather than treating the QUnit page itself as a playground.

During early integration, the existing jQuery.IME examples may be sufficient.

Later, the public VIWP.IME playground should provide a dedicated environment for:

```text
VNI
Telex
VIQR
```

and possibly tone-placement variants.

---

# 43. Manual exploratory testing

Manual testing is particularly useful for discovering sequences not anticipated by fixtures.

A useful exploratory session may try:

```text
move command earlier in the syllable

move command later in the syllable

replace one tone with another

repeat a command

type punctuation immediately afterward

continue into another syllable

mix Vietnamese with numbers

mix Vietnamese with English

use uppercase

place caret in unusual locations
```

Unexpected behavior should be recorded.

Stable bugs should become automated tests.

---

# 44. Public playground testing

The future public playground is intended to collect real-user feedback.

It should load the same production VIWP.IME code used by jQuery.IME integration.

It should not contain a second implementation of Vietnamese typing.

Feedback gathered through the playground may reveal:

* missing typing conventions;
* unexpected escape behavior;
* typing-order expectations;
* terminology problems;
* browser-level issues inherited from jQuery.IME.

---

# 45. Level 5 — Full upstream regression suite

The complete jQuery.IME test suite is the final regression layer.

At the current baseline, the project has already verified the upstream suite before Vietnamese-specific changes begin.

This baseline should remain recorded as the clean starting point for the VIWP.IME branch.

---

# 46. Full-suite purpose

The full suite answers:

> Did Vietnamese development break anything outside Vietnamese support?

It is not the preferred inner-loop test because it exercises hundreds of unrelated input methods and currently takes substantially longer than focused Vietnamese work.

That cost is acceptable for regression gates.

---

# 47. Recommended development test cadence

The default workflow should use three practical loops.

## Fast loop

Run while actively implementing a small Vietnamese behavior.

Target:

```text
seconds where practical
```

Run only:

* directly relevant pure unit tests;
* relevant generated tests;
* relevant focused integration tests when needed.

The exact command or QUnit filtering mechanism will be finalized after Phase 2 establishes the test packaging.

---

## Vietnamese integration loop

Run before a meaningful commit or after completing a small feature.

Run:

* all pure Vietnamese engine tests;
* all generated Vietnamese tests appropriate for normal development;
* all Vietnamese jQuery.IME integration fixtures;
* relevant lint checks.

This should be much faster than the complete upstream suite.

---

## Full regression loop

Run:

```text
npx grunt --force
```

or the equivalent current upstream command.

Use this:

* before important pushes;
* after changes to integration or loading;
* at milestones;
* before requesting upstream review;
* before declaring the branch PR-ready.

The full suite does not need to run after every few lines of Vietnamese engine code.

---

# 48. Do not optimize the test runner prematurely

Phase 1 does not require modifications to:

```text
Gruntfile.js
```

solely to obtain a Vietnamese-only command.

During Phase 2, the project should determine whether existing QUnit filtering and repository conventions already provide a sufficiently fast workflow.

A custom task should only be added if it:

* materially improves development speed;
* remains simple;
* does not complicate the upstream patch unnecessarily.

Project-local tooling that will not be part of the upstream PR should be clearly separated from upstream-required changes.

---

# 49. Current upstream command

The current upstream documentation uses:

```text
grunt --force
```

and the project baseline has been verified through:

```text
npx grunt --force
```

The repository's current Grunt configuration remains authoritative.

If upstream changes its testing commands during VIWP.IME development, this document should be updated rather than preserving obsolete commands.

---

# 50. Test naming

Test names should describe behavior rather than implementation.

Prefer:

```text
VNI horn preserves existing acute tone
```

over:

```text
mark() test 17
```

Prefer:

```text
traditional placement uses first vowel in open oa
```

over:

```text
regex oa test
```

Names should remain meaningful even if implementation internals are refactored.

---

# 51. Test input examples

VNI should be preferred when documentation or test design needs only one method-specific example.

This reflects project convention and does not imply that VNI semantics are more canonical than Telex or VIQR.

Pure engine tests should generally use semantic commands instead of VNI digits.

For example:

```text
APPLY_TONE(ACUTE)
```

is preferable to:

```text
1
```

inside transformation-engine tests.

The digit belongs in VNI adapter and integration tests.

---

# 52. Test-data separation

Where large inventories are required, test data should be separated from test logic.

For example:

```text
valid onsets
valid endings
nucleus families
tone-placement cases
precursor cases
```

may live in structured fixtures or grammar data.

Avoid embedding large unrelated word lists directly into assertion code.

---

# 53. Regression tests

Every confirmed bug should receive the smallest useful regression test.

If the bug belongs to the pure engine, the regression should primarily live there.

If the bug exists only through the jQuery.IME integration path, an integration fixture should reproduce it.

Some important bugs may justify both.

---

# 54. Minimal regression principle

A regression test should isolate the behavior that failed.

For example, if:

```text
quốc
```

fails because `u` is chosen as the tone target, the regression test should explicitly demonstrate that structural problem.

Do not rely only on a long sentence containing the word.

Small failures are easier to understand and maintain.

---

# 55. Real-word examples versus structural examples

Tests may use both real Vietnamese words and synthetic structural forms.

Real words are useful because they are understandable during review.

Synthetic forms are useful because they isolate grammar combinations.

A structural engine should not be tested exclusively through dictionary words.

When a synthetic form is used, the test description should make clear that the test concerns structure rather than lexical validity.

---

# 56. Test sources

When test cases are derived from an external orthographic inventory or reference, the source should be documented where practical.

The project should distinguish:

```text
normative Unicode behavior
```

from:

```text
orthographic research data
```

and:

```text
observed input-method convention
```

This is especially important when resolving ambiguous or unusual Vietnamese typing behavior.

---

# 57. Existing input-method behavior

Established input methods such as UniKey may be consulted when the question is specifically about typing convention.

Examples include:

```text
repeated-key escape
vowel-diacritic replacement
literal command behavior
```

Observed software behavior should be recorded as evidence, not silently treated as a linguistic rule.

Where VIWP.IME intentionally differs, the expected behavior should be documented.

---

# 58. Test coverage categories

Before upstream submission, automated coverage should include at least the following categories.

## Orthographic structure

```text
empty onset
single-letter onset
multiletter onset
qu
gi

simple nucleus
complex nucleus family
medial
off-glide
consonantal coda

open syllable
checked syllable
```

## Tone

```text
NONE
ACUTE
GRAVE
HOOK
TILDE
DOT

tone application
tone replacement
tone removal
tone placement
```

## Vowel diacritics

```text
circumflex
breve
horn

with no tone
with existing tone
```

## Composition

```text
complete state
intermediate state

command before ending
command after ending

tone before vowel diacritic
vowel diacritic before tone

equivalent-order convergence
```

## Input methods

```text
VNI
Telex
VIQR
```

## Input behavior

```text
repeated-key escape
literal fallback
uppercase
mixed case
```

## Unicode

```text
NFC
canonically equivalent input where supported
normalization
combining-mark correctness
```

## Integration

```text
input
contenteditable
textarea where relevant
input-method registration
input-method loading
```

---

# 59. Negative tests

The suite should include negative cases.

Examples include:

* semantic command not applicable to the current candidate;
* incompatible vowel diacritic;
* unrecognized composition;
* structurally incompatible tone;
* command key intended to remain literal;
* candidate boundary after punctuation or whitespace.

Negative tests are important because a Vietnamese input method can be incorrect by transforming too much, not only by failing to transform valid input.

---

# 60. Foreign-text tests

Strict foreign-text protection is not an initial requirement, but representative mixed-text regression tests should eventually be added.

They may include:

```text
technical identifiers
English fragments
numbers
URLs
code-like text
```

The first implementation does not need to prove that every foreign word is immune from accidental transformation.

The test corpus should grow as concrete failures are observed.

---

# 61. `a11y` as a canonical escape case

The string:

```text
a11y
```

is a useful canonical test for VNI repeated-key escape.

It demonstrates a practical reason why escape behavior matters.

A relevant integration sequence should establish that typing the intended literal technical string is possible without disabling the input method.

The exact intermediate outputs should follow the finalized VNI escape specification.

---

# 62. Property-based testing

The project may use property-based testing if it integrates cleanly with the repository.

It is not required.

Many useful properties can already be generated deterministically from finite Vietnamese grammar data.

Adding a testing library should require a clear benefit and should not unnecessarily complicate the upstream dependency graph.

---

# 63. Randomized tests

Randomized tests may be useful during local development for discovering unexpected state interactions.

They should not be relied on as the only regression mechanism.

Any bug discovered through random generation should be converted into a deterministic test case.

Upstream tests should remain reproducible.

---

# 64. Performance tests

Formal performance benchmarking is not an initial requirement.

The engine operates on a short candidate, so correctness should come first.

Performance investigation becomes appropriate if:

* typing becomes perceptibly slow;
* generated tests reveal pathological parsing cost;
* regular expressions exhibit excessive backtracking;
* integration adds significant latency.

Any optimization should preserve the same behavioral tests.

---

# 65. Testing parser ambiguity

Where one surface candidate could have multiple possible parses, tests should explicitly verify the intended deterministic resolution.

Important ambiguity classes include:

```text
qu
gi
medial versus nucleus
complex nucleus families
intermediate precursor states
```

The expected parse should be based on explicit orthographic rules rather than implementation order.

---

# 66. Testing candidate boundaries

Candidate extraction should receive direct tests once its algorithm is established.

Representative preceding contexts should include:

```text
whitespace
punctuation
opening bracket
closing bracket
digit
Latin word
line boundary
```

Tests should verify both:

```text
which suffix is selected
```

and:

```text
which preceding text remains untouched
```

---

# 67. Testing `maxKeyLength`

During the integration spike, tests should establish that the chosen `maxKeyLength` is sufficient for:

* the longest required complete candidate;
* intermediate VNI composition;
* flexible command placement;
* escape behavior.

Boundary tests should include a candidate at the maximum supported range.

The value should be chosen from evidence rather than inherited from an older implementation.

---

# 68. Testing jQuery.IME context assumptions

If VIWP.IME ultimately uses:

```text
contextLength > 0
```

for any behavior, that behavior must receive dedicated tests.

The test should demonstrate why rendered text plus the incoming command is insufficient.

Use of context should remain narrow.

Ordinary Vietnamese composition should not depend on replaying raw input history.

---

# 69. Test failure diagnosis

When an integration fixture fails, debugging should generally proceed downward through the architecture:

```text
raw input
↓
adapter command decoding
↓
candidate extraction
↓
parser output
↓
transformation
↓
tone placement
↓
rendered output
↓
jQuery.IME replacement
```

This is another reason each internal layer should have direct tests.

A failure should not require reasoning through one large monolithic transliteration function.

---

# 70. Continuous integration

The upstream repository's existing CI should remain the final authority for the submitted patch.

VIWP.IME should avoid creating a separate CI architecture unless project-specific tooling genuinely requires it.

Any additional project CI should complement rather than replace upstream checks.

---

# 71. Pre-commit expectations

Not every local commit requires the complete upstream suite.

Before a normal implementation commit, the developer should normally ensure:

* directly affected pure tests pass;
* all Vietnamese engine tests pass where practical;
* all relevant Vietnamese integration fixtures pass;
* relevant lint checks pass.

The exact commands will be added after Phase 2 establishes the final test layout.

---

# 72. Pre-push expectations

Before an important push, especially one intended for review:

```text
all Vietnamese tests
+
relevant lint
+
full upstream suite
```

should normally pass.

If the complete upstream suite is intentionally skipped, the reason should be known and the suite should be run before the next milestone.

---

# 73. Milestone expectations

At the end of each substantial implementation phase:

```text
Phase 2 — integration spike
Phase 3 — core engine
Phase 4 — VNI
Phase 5 — composition behavior
Phase 7 — Telex and VIQR
Phase 9 — upstream hardening
```

the complete upstream suite should be run and the result recorded during development.

This catches accumulated integration regressions early.

---

# 74. Pull-request gate

Before VIWP.IME is proposed upstream:

* all pure engine tests must pass;
* all generated deterministic tests must pass;
* all Vietnamese jQuery.IME integration fixtures must pass;
* the complete upstream jQuery.IME test suite must pass;
* relevant lint checks must pass;
* manual typing must have been performed with all supported input methods;
* known failures must be documented rather than silently ignored.

A failing unrelated upstream test should be investigated and documented before submission.

---

# 75. Test documentation

Tests should be understandable to an upstream reviewer who is not a Vietnamese speaker.

Descriptions should explain the property being tested.

For example:

```text
VNI 0 removes tone but preserves horn
```

is more useful than:

```text
Vietnamese test 47
```

Where a Vietnamese example is not self-explanatory, a concise English explanation should accompany it.

---

# 76. Vietnamese examples in developer tests

Vietnamese strings should be written as normal Unicode text where readability matters.

For example:

```text
tường
```

is preferable to encoding every character as hexadecimal escapes.

Unicode escapes may still be appropriate when specifically testing code points, decomposition, or normalization.

---

# 77. Test readability versus exhaustiveness

Handwritten tests should prioritize readability.

Generated tests should provide exhaustiveness.

Do not manually duplicate hundreds of nearly identical assertions merely to claim coverage.

For example:

```text
one readable representative test per semantic rule
+
generated coverage over the full grammar class
```

is preferable to hundreds of manually maintained variants.

---

# 78. Golden corpora

The project may eventually maintain a deterministic corpus of Vietnamese:

```text
canonical syllables
composition sequences
known regressions
```

Such a corpus should remain version-controlled and reviewable.

It should clearly distinguish:

```text
grammar-generated cases
```

from:

```text
human-selected regression cases
```

and:

```text
external-source cases
```

---

# 79. Test data should not become hidden specification

If a behavior exists only because a large fixture file happens to contain a particular output, the developer documentation is incomplete.

Important semantic rules should be documented in:

```text
requirements.md
```

or:

```text
orthographic-model.md
```

as appropriate.

Tests verify the specification.

They should not silently replace it.

---

# 80. Phase 2 testing questions

The integration spike should answer the following testing questions before substantial production implementation begins.

## Pure test loading

How should shared Vietnamese engine modules be loaded into the existing QUnit setup?

## Focused test command

What is the fastest upstream-compatible way to run only VIWP.IME tests during development?

Possibilities may include:

```text
QUnit browser filtering
existing Grunt options
a minimal additional task
```

but no mechanism is prescribed yet.

## Integration fixture organization

Should Vietnamese fixtures live:

```text
inside the existing fixture file
```

or be separated in an upstream-compatible way?

## Contenteditable coverage

Should the existing automatic input/contenteditable duplication be used for all Vietnamese integration fixtures, or only representative groups?

## Generated tests

Where should large generated grammar tests live so that they remain fast and do not make the browser integration suite unnecessarily expensive?

## Module exposure

How can internal pure-engine functions be made testable without creating unnecessary public APIs?

---

# 81. Initial recommended workflow

Until Phase 2 establishes more focused commands, the developer may use the following practical workflow.

### Baseline / regression

Use:

```text
npx grunt --force
```

for the complete repository suite.

### Interactive QUnit inspection

Use:

```text
test/index.html
```

through a local web server.

Use QUnit filtering once Vietnamese test names exist.

### Manual typing

Use:

```text
examples/index.html
```

or the later VIWP.IME playground.

The QUnit runner and typing playground serve different purposes and should not be confused.

---

# 82. Baseline state

Before VIWP.IME production code was introduced, the project established a clean upstream baseline.

The complete suite reported:

```text
963 tests completed
0 failed
0 skipped
0 todo
```

This baseline provides a known-good reference for later integration work.

The exact test count may change as upstream and VIWP.IME add tests, so the number itself is not a permanent acceptance criterion.

The permanent criterion is:

> all expected upstream and VIWP.IME tests pass.

---

# 83. Testing acceptance criteria

The VIWP.IME testing architecture is successful when:

### Fast feedback exists

A developer can work on one Vietnamese behavior without waiting for the complete unrelated jQuery.IME suite after every small edit.

### Pure semantics are directly testable

Tone, vowel-diacritic, parsing, rendering, and validation behavior can be tested without DOM interaction.

### Large coverage is affordable

Thousands of structural cases can be checked without thousands of simulated browser typing sessions.

### Integration is still proven

Representative raw VNI, Telex, and VIQR sequences are tested through actual jQuery.IME fixtures.

### Browser behavior is manually inspectable

The implementation can be tried interactively in a real editable element.

### Upstream remains protected

The complete jQuery.IME suite remains green before review and submission.

### Bugs remain fixed

Every significant regression receives a deterministic automated test.

---

# 84. Summary

The VIWP.IME testing model is:

```text
Vietnamese grammar
        │
        ▼
┌─────────────────────────┐
│ Pure unit tests         │
│                         │
│ parser                  │
│ transformations         │
│ tone placement          │
│ renderer                │
│ Unicode                 │
│ validation              │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Generated / invariant   │
│ tests                   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ jQuery.IME integration  │
│ fixtures                │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Manual browser testing  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Full upstream suite     │
└─────────────────────────┘
```

The normal development loop should therefore be:

```text
focused Vietnamese test
        ↓
implement
        ↓
focused Vietnamese test
        ↓
Vietnamese integration test
        ↓
commit
        ↓
periodic full upstream regression
```

rather than:

```text
tiny code edit
        ↓
wait for every jQuery.IME input method to be retested
        ↓
tiny code edit
        ↓
repeat
```

The complete upstream suite remains essential, but it is a regression gate rather than the primary inner development loop.
