# VIWP.IME Architecture

This document defines the intended software architecture of VIWP.IME.

It describes the boundaries between jQuery.IME, input-method-specific behavior, the shared Vietnamese transformation engine, the orthographic model, Unicode processing, and rendering.

This document intentionally does **not** freeze the exact file layout or loading strategy inside jQuery.IME. Those details must be validated against the current upstream repository during the integration spike.

The behavioral contract is defined in [`requirements.md`](./requirements.md).

The linguistic and orthographic domain model is defined in [`orthographic-model.md`](./orthographic-model.md).

Canonical terminology is defined in [`terminology.md`](./terminology.md).

---

# 1. Architectural goals

VIWP.IME should satisfy the following architectural goals:

* implement VNI, Telex, and VIQR on top of one shared Vietnamese engine;
* keep Vietnamese orthographic behavior independent from input-method key mappings;
* model transformations semantically rather than as a large ordered replacement table;
* keep the core engine as independent from jQuery.IME and the DOM as practical;
* make parsing, transformation, validation, tone placement, and rendering individually testable;
* use the rendered text near the caret as the primary representation of the current composition;
* preserve explicit separation between semantic state and Unicode surface representation;
* permit future conservative spelling validation without redesigning the transformation engine;
* avoid changes to jQuery.IME core unless a concrete integration blocker is demonstrated.

---

# 2. Non-goals

The architecture does not attempt to:

* replace the jQuery.IME event system;
* implement a general browser IME framework;
* define browser or operating-system compatibility independently from jQuery.IME;
* reproduce the internal design of AVIM, UniKey, or another existing Vietnamese input method;
* encode Vietnamese orthography as hundreds of ordered regular-expression substitutions;
* implement lexical spell checking;
* maintain separate Vietnamese transformation engines for VNI, Telex, and VIQR.

---

# 3. High-level architecture

The intended architecture is:

```text
┌───────────────────────────────────┐
│            jQuery.IME             │
│                                   │
│ keyboard events                   │
│ caret / text access               │
│ input-method loading              │
│ replacement of text near caret    │
└─────────────────┬─────────────────┘
                  │
                  ▼
┌───────────────────────────────────┐
│       Input-method adapter        │
│                                   │
│ VNI / Telex / VIQR                │
│ decode method-specific input      │
└─────────────────┬─────────────────┘
                  │
                  ▼
┌───────────────────────────────────┐
│         Semantic command          │
│                                   │
│ APPLY_TONE                        │
│ REMOVE_TONE                       │
│ APPLY_VOWEL_DIACRITIC             │
│ APPLY_D_STROKE                    │
│ ESCAPE / literal behavior         │
└─────────────────┬─────────────────┘
                  │
                  ▼
┌───────────────────────────────────┐
│      Vietnamese engine            │
│                                   │
│ candidate extraction              │
│ parsing                           │
│ composition-state classification  │
│ semantic transformation           │
│ orthographic validation           │
│ tone placement                    │
│ rendering                         │
└─────────────────┬─────────────────┘
                  │
                  ▼
┌───────────────────────────────────┐
│       Unicode replacement         │
│                                   │
│ preferably normalized NFC         │
└───────────────────────────────────┘
```

The key architectural principle is:

> jQuery.IME provides the input host; VIWP.IME provides Vietnamese composition semantics.

---

# 4. jQuery.IME as the host

VIWP.IME should treat jQuery.IME as an external host architecture.

The Vietnamese implementation should rely on existing jQuery.IME facilities for:

* receiving keyboard events;
* determining the active input method;
* reading text immediately before the caret;
* replacing text immediately before the caret;
* loading input-method definitions;
* handling editable-element abstractions;
* integration with the input-method selector.

Vietnamese-specific code should not duplicate these responsibilities.

---

# 5. Current jQuery.IME transliteration contract

In the current jQuery.IME architecture, the host obtains a bounded amount of text before the caret using the input method's `maxKeyLength`, appends the newly entered character, and passes the resulting string to the input method's transliteration logic.

Conceptually:

```text
text before caret
      +
newly typed key
      ↓
input-method patterns
      ↓
replacement result
```

An input method may provide `patterns` as a function rather than only as a regular-expression table.

This capability is the intended integration point for VIWP.IME.

Conceptually:

```javascript
patterns: function ( input, context ) {
    return vietnameseAdapter( input, context );
}
```

The exact function signature and return form must follow the current jQuery.IME API.

---

# 6. Replacement boundary

The jQuery.IME host replaces a bounded amount of text immediately before the caret.

VIWP.IME therefore does not operate on arbitrary locations in the document.

The adapter receives a short text window conceptually similar to:

```text
... preceding text [candidate][new key]
                                 ^
                               caret
```

The Vietnamese implementation must determine which suffix of the available window belongs to the current composition candidate.

The engine should not assume that every character in the jQuery.IME input window belongs to the Vietnamese syllable.

---

# 7. `maxKeyLength`

jQuery.IME uses `maxKeyLength` to determine how much preceding text is provided to an input method.

For VIWP.IME, `maxKeyLength` should be large enough to contain:

* the longest ordinary Vietnamese orthographic candidate;
* valid intermediate composition forms;
* sufficient text for flexible command placement;
* any literal command character needed for escape behavior.

It should not be chosen by counting the length of the largest regular expression.

The exact value is deliberately not specified in Phase 1.

It must be determined during the integration spike using:

* Vietnamese composition requirements;
* actual jQuery.IME behavior;
* representative tests;
* Unicode code-unit considerations.

---

# 8. jQuery.IME context is not the composition state

jQuery.IME provides a separate `context` buffer containing a bounded history of previously entered input characters.

VIWP.IME should **not** use this buffer as the primary source of truth for Vietnamese composition.

The rendered text before the caret is the preferred source of truth.

Reasons include:

* text may already have been transformed;
* caret movement may invalidate assumptions about raw input history;
* deletion may reset input context;
* text may have been pasted or edited outside the input method;
* the same Vietnamese result may be reached through different typing orders.

The preferred model is therefore:

```text
rendered text near caret
        ↓
parse current state
        ↓
apply new command
```

rather than:

```text
replay all historical keystrokes
        ↓
reconstruct current state
```

The jQuery.IME context buffer MAY still be used for behavior that fundamentally depends on recent raw-key history, provided such use is narrow and explicitly documented.

---

# 9. Shared Vietnamese engine

The central component of VIWP.IME is one shared Vietnamese transformation engine.

It is responsible for Vietnamese-specific semantics including:

* parsing an orthographic candidate;
* recognizing intermediate composition states;
* representing tone;
* representing vowel diacritics;
* applying semantic transformations;
* handling `qu` and `gi`;
* applying structural constraints;
* calculating tone placement;
* rendering Unicode output.

The engine must not depend on whether the user selected VNI, Telex, or VIQR.

---

# 10. Input-method adapters

Each supported input method should have a thin adapter.

Initially:

```text
VNI adapter
Telex adapter
VIQR adapter
```

The adapter is responsible for:

* identifying method-specific command keys;
* translating those keys into semantic commands;
* implementing method-specific escape conventions;
* passing the candidate and semantic command to the shared engine;
* converting the engine result into the form required by jQuery.IME.

The adapter should contain as little Vietnamese orthographic logic as possible.

---

# 11. Semantic command layer

Input-method keys should be converted into semantic commands before Vietnamese orthographic transformation occurs.

For example:

```text
VNI   1
Telex s
VIQR  '
       │
       ▼
APPLY_TONE(ACUTE)
```

Similarly:

```text
VNI 6
    ↓
APPLY_VOWEL_DIACRITIC(CIRCUMFLEX)
```

and:

```text
VNI 0
    ↓
REMOVE_TONE
```

A conceptual semantic-command model could include:

```text
APPLY_TONE(tone)

REMOVE_TONE

APPLY_VOWEL_DIACRITIC(diacritic)

APPLY_D_STROKE
```

Additional commands may be introduced if implementation demonstrates a genuine semantic distinction.

The exact JavaScript representation is not frozen by this document.

---

# 12. VNI command mapping

VNI should initially provide the clearest reference implementation of the adapter layer.

Conceptually:

```text
0 → REMOVE_TONE

1 → APPLY_TONE(ACUTE)
2 → APPLY_TONE(GRAVE)
3 → APPLY_TONE(HOOK)
4 → APPLY_TONE(TILDE)
5 → APPLY_TONE(DOT)

6 → APPLY_VOWEL_DIACRITIC(CIRCUMFLEX)
7 → APPLY_VOWEL_DIACRITIC(HORN)
8 → APPLY_VOWEL_DIACRITIC(BREVE)

9 → APPLY_D_STROKE
```

These mappings belong to the VNI adapter.

The shared Vietnamese engine must not contain logic such as:

```text
if key == "7":
    apply horn
```

---

# 13. Telex and VIQR

Telex and VIQR should be added after the shared engine and VNI behavior are stable.

Their adapters should translate their respective key conventions into the same semantic command vocabulary.

If adding Telex or VIQR requires duplicating substantial code for:

* parsing;
* tone placement;
* vowel-diacritic transformation;
* `qu`;
* `gi`;
* Unicode rendering;

then the shared-engine boundary should be reconsidered.

A successful architecture should make new input-method adapters comparatively small.

---

# 14. Candidate extraction

The jQuery.IME input window may contain text unrelated to the current Vietnamese syllable.

A candidate-extraction stage should therefore identify the suffix that may participate in the current composition.

Conceptually:

```text
"hello tuong" + "7"
       │
       ▼
available host input:
"hello tuong7"
       │
       ▼
candidate:
"tuong"
       │
command:
7
```

Candidate extraction should consider boundaries such as:

* whitespace;
* punctuation;
* characters that clearly cannot participate in the current Vietnamese composition;
* jQuery.IME's available input-window boundary.

The exact extraction algorithm is an implementation detail.

---

# 15. Candidate versus command

The incoming input-method key should be conceptually separated from the candidate before the orthographic parser runs.

For example:

```text
host input:
tuong7
```

under VNI should conceptually become:

```text
candidate:
tuong

input command:
7

semantic command:
APPLY_VOWEL_DIACRITIC(HORN)
```

The Vietnamese parser should therefore parse:

```text
tuong
```

rather than treating:

```text
tuong7
```

as Vietnamese orthography.

This separation keeps input syntax outside the orthographic model.

---

# 16. Parser

The parser converts a candidate surface string into a structured composition state.

Conceptually:

```text
surface candidate
       ↓
Unicode analysis
       ↓
orthographic parse
       ↓
CompositionState
```

The parser should recognize:

* onset;
* special onset structures;
* rime;
* medial where applicable;
* nucleus or nucleus family;
* ending;
* tone;
* vowel diacritics;
* case information;
* complete versus intermediate state.

The parser should be deterministic.

---

# 17. Parser output

A conceptual parser result might resemble:

```javascript
{
    status: 'complete',

    onset: 't',

    rime: {
        medial: null,
        nucleus: {
            family: 'UO_HORN',
            spelling: 'ươ'
        },
        ending: {
            type: 'consonantal-coda',
            value: 'ng'
        }
    },

    tone: 'grave',

    casePattern: ...
}
```

This example is illustrative only.

The final representation may use:

* objects;
* enums;
* compact tables;
* indexes;
* another deterministic structure.

The domain distinctions are more important than the exact shape.

---

# 18. Intermediate-state parser

The parser must not be limited to completed Vietnamese orthography.

It must also recognize **intermediate composition states**.

For example:

```text
tuong
```

may be interpreted as a composable precursor from which VNI `7` can produce:

```text
tương
```

The parser should therefore support outcomes conceptually similar to:

```text
COMPLETE
INTERMEDIATE
UNRECOGNIZED
```

A simple Boolean:

```javascript
isVietnamese
```

is insufficient.

---

# 19. Parsing versus validation

Parsing and validation should be conceptually separate.

Parsing asks:

> What structure could this candidate represent?

Validation asks questions such as:

> Is this a complete canonical Vietnamese spelling?

> Is this tone allowed with this ending?

> Is this state acceptable as an intermediate composition?

The engine should avoid making aggressive validation a prerequisite for parsing.

This separation allows the initial implementation to prioritize successful Vietnamese composition while adding stricter foreign-text protection later.

---

# 20. Orthographic grammar data

Vietnamese structural knowledge should preferably be represented as reusable data where practical.

Examples include:

* recognized onset spellings;
* nucleus families;
* permitted medial–nucleus combinations;
* permitted endings;
* precursor relationships;
* contextual spellings;
* checked-syllable tone restrictions.

Conceptually:

```text
orthographic grammar data
        │
        ├── parser
        ├── validator
        ├── renderer
        └── generated tests
```

should use shared information rather than maintaining independent copies of the same Vietnamese rules.

---

# 21. Semantic composition state

After parsing, transformations should operate on semantic composition state rather than directly manipulating visible Unicode characters whenever practical.

For example:

```text
tường
```

should conceptually expose:

```text
tone = GRAVE
```

rather than requiring a transformation to search specifically for the character:

```text
ờ
```

A later acute command should conceptually perform:

```text
tone = ACUTE
```

and allow the renderer to produce:

```text
tướng
```

---

# 22. Transformation engine

The transformation stage applies a semantic command to the current composition state.

Conceptually:

```text
CompositionState
+
SemanticCommand
+
Options
        ↓
TransformationResult
```

A possible pure interface is:

```javascript
transform( state, command, options )
```

or:

```javascript
transformCandidate( candidate, command, options )
```

The exact API is not frozen.

The important property is that the transformation is deterministic and testable independently from DOM events.

---

# 23. Transformation result

A transformation should be able to communicate more than only a replacement string.

Conceptually, the engine may need to distinguish:

```text
HANDLED
NOT_HANDLED
ESCAPED
```

and possibly an updated composition state.

For example:

```javascript
{
    handled: true,
    output: 'tường'
}
```

or:

```javascript
{
    handled: false
}
```

The adapter is responsible for mapping this result to jQuery.IME's expected transliteration result.

---

# 24. No-op behavior

If the current key cannot reasonably be interpreted as a Vietnamese input command in the current context, VIWP.IME should allow ordinary input to proceed.

Conceptually:

```text
engine:
NOT_HANDLED
        ↓
adapter:
jQuery.IME noop / pass-through
```

Vietnamese code should not rewrite the text merely because a command key exists in the selected input method.

The exact distinction between literal fallback and escape behavior is defined by the input method and requirements.

---

# 25. Escape behavior

Repeated-key escape may require information about both:

* the rendered candidate;
* the current input command.

For example:

```text
a1
→ á

a11
→ a1
```

The architecture should prefer deriving this behavior from the current rendered state plus current command when possible.

Raw input history should only be required where the desired behavior cannot be reconstructed safely from rendered state.

Escape semantics belong partly to the input-method adapter because the literal command character is input-method-specific.

---

# 26. Tone representation

Tone is a semantic property of the composition state.

Conceptually:

```text
Tone.NONE
Tone.ACUTE
Tone.GRAVE
Tone.HOOK
Tone.TILDE
Tone.DOT
```

Applying another tone should modify this property:

```text
Tone.GRAVE
+
APPLY_TONE(ACUTE)
        ↓
Tone.ACUTE
```

It should not conceptually perform:

```text
find grave-marked Unicode vowel
→ replace with acute-marked Unicode vowel
```

even if lookup tables are later used as an efficient rendering implementation.

---

# 27. Vowel-diacritic representation

Vowel diacritics should likewise be semantic properties of vowel identity.

Relevant categories are:

```text
NONE
CIRCUMFLEX
BREVE
HORN
```

The transformation engine should preserve tone independently when a vowel-diacritic command modifies the nucleus.

For example:

```text
á
+
CIRCUMFLEX
        ↓
tone remains ACUTE
vowel becomes â
        ↓
ấ
```

---

# 28. Tone relocation is not a semantic operation

The architecture should not introduce a fundamental command named:

```text
MOVE_TONE
```

Tone relocation is a rendering consequence.

For example:

```text
old structure
+
structural transformation
        ↓
new structure
+
same semantic tone
        ↓
renderer recalculates tone target
```

This removes the need to explicitly track where a tone mark used to be.

---

# 29. Tone-placement policy

Tone placement should be represented as a rendering policy.

Conceptually:

```text
TonePlacement.TRADITIONAL
TonePlacement.REFORMED
```

The default initial configuration is:

```text
TRADITIONAL
```

A renderer conceptually performs:

```javascript
findToneTarget( state, tonePlacement )
```

The policy should not be embedded separately in VNI, Telex, and VIQR.

---

# 30. Renderer

The renderer converts semantic composition state into Unicode text.

Conceptually:

```text
CompositionState
+
RenderOptions
        ↓
Unicode string
```

Its responsibilities include:

* selecting contextual orthographic spellings;
* rendering vowel diacritics;
* determining the tone-bearing position;
* applying the tone mark;
* preserving capitalization;
* producing a consistent Unicode representation.

---

# 31. Contextual spelling

Some semantic nucleus families may have multiple surface spellings depending on structure.

Examples include families represented by spellings such as:

```text
ia / iê
ua / uô
ưa / ươ
```

The renderer should determine the appropriate spelling from the composition state rather than requiring unrelated transformation rules for each visible form.

This allows parser and renderer to share one semantic model.

---

# 32. Unicode layer

Unicode representation must remain separate from Vietnamese orthographic semantics.

A conceptual Unicode layer should provide operations such as:

```text
decompose Vietnamese character
identify base vowel
identify vowel diacritic
identify tone
compose/render Vietnamese character
normalize output
```

These may be implemented with:

* Unicode normalization;
* lookup tables;
* a combination of both.

The implementation should be selected through testing rather than assumed in Phase 1.

---

# 33. NFD as a possible internal tool

NFD is a promising mechanism for decomposing Vietnamese vowel characters into:

```text
base letter
+
vowel diacritic
+
tone mark
```

For example, it may simplify determining that a visible character semantically represents:

```text
a
+
CIRCUMFLEX
+
ACUTE
```

However:

> NFD is an implementation technique, not the domain model.

The engine should not expose combining-mark ordering as Vietnamese semantics.

---

# 34. NFC output

Final output should preferably be normalized to NFC.

Conceptually:

```text
semantic state
       ↓
render
       ↓
canonical Unicode
       ↓
NFC
```

This provides predictable final text while still allowing the parser to accept canonically equivalent forms where practical.

---

# 35. Case handling

Case should be preserved separately from orthographic classification.

The grammar should not require duplicated entries such as:

```text
ng
Ng
NG
```

for every structural rule.

Conceptually:

```text
parse case-insensitively
+
retain surface case information
        ↓
render with intended case
```

The exact case model is an implementation detail.

---

# 36. `qu` handling

`qu` must be represented explicitly by the parser.

The ordinary invariant is:

> The `u` belonging to the `qu` onset must not be treated as an independent tone-bearing nucleus vowel.

Conceptually:

```text
quốc
→ onset: qu
→ nucleus: ô
→ ending: c
→ tone: ACUTE
```

The `qu` behavior should live in the shared orthographic parser, not in VNI-specific rules.

---

# 37. `gi` handling

`gi` must also be explicitly modeled.

The implementation must account for the orthographic interaction between the `i` in `gi` and rimes beginning in the `i` family.

The exact representation is deliberately deferred because several clean models may be possible.

Possible approaches include:

* a special `GI` onset representation;
* surface overlap metadata;
* another deterministic structural representation.

The chosen design must be documented after the implementation spike.

It must not be resolved implicitly by regular-expression priority.

---

# 38. Checked-syllable constraints

The structural model should represent that consonantal codas:

```text
p
t
c
ch
```

permit only:

```text
ACUTE
DOT
```

in structurally complete standard Vietnamese syllables.

This constraint belongs to orthographic validation.

The transformation engine and adapter must still decide, according to requirements, what to do when the user explicitly requests an incompatible tone.

---

# 39. Validation layer

Validation should be capable of answering different questions separately.

Conceptually:

```text
classifyComposition( state )
```

may expose information such as:

```text
isComposable
isComplete
isCanonical
isToneCompatible
```

The engine should avoid collapsing all these distinctions into one Boolean.

For example:

```text
tuong
```

may be:

```text
not canonical final Vietnamese
but composable
```

while another candidate may be:

```text
unrecognized
and not safely transformable
```

---

# 40. Conservative validation

Strict foreign-text protection is deferred.

The initial validator should therefore be conservative.

Its main role is to:

* prevent clearly impossible structural transformations;
* support correct Vietnamese composition;
* provide enough state classification for future stricter behavior.

Later spelling protection may use the same grammar without changing the transformation architecture.

---

# 41. Pure core functions

Core Vietnamese logic should be implemented as pure or near-pure functions wherever practical.

Examples might include:

```text
parseCandidate()
classifyComposition()
applyTone()
removeTone()
applyVowelDiacritic()
applyDStroke()
findToneTarget()
renderSyllable()
```

These names are illustrative.

A pure function should:

* depend only on explicit input;
* avoid DOM access;
* avoid global jQuery.IME state;
* return deterministic output;
* be easy to unit test.

---

# 42. DOM independence

The shared Vietnamese engine must not:

* inspect DOM selections;
* subscribe to keyboard events;
* modify `<input>` values;
* manipulate `contenteditable`;
* know about jQuery selectors.

Those responsibilities belong to jQuery.IME.

This boundary allows the same engine behavior to be tested without simulated browser typing.

---

# 43. Input-method independence

The shared engine must not:

* know that VNI uses numbers;
* know that Telex uses letters such as `s`, `f`, or `w`;
* know that VIQR uses punctuation;
* select an input method;
* contain input-method-specific labels.

Its API receives semantic commands.

---

# 44. Host independence

The engine should also avoid depending directly on:

```text
$.ime
```

where practical.

A thin integration layer may depend on jQuery.IME.

The core orthographic modules should not.

Conceptually:

```text
jQuery.IME-specific code
        ↓
adapter boundary
        ↓
host-independent Vietnamese engine
```

This boundary substantially improves testability and maintainability.

---

# 45. Proposed execution flow

A typical VNI keystroke should conceptually follow this sequence.

Example:

```text
existing text:
tuong

new key:
7
```

### Step 1 — jQuery.IME obtains its input window

```text
tuong7
```

### Step 2 — VNI adapter separates the command

```text
candidate:
tuong

input command:
7
```

### Step 3 — command decoder produces a semantic command

```text
APPLY_VOWEL_DIACRITIC(HORN)
```

### Step 4 — candidate is parsed

Conceptually:

```text
tuong
→ intermediate composition state
```

### Step 5 — semantic transformation is applied

```text
precursor vowel structure
+
HORN
        ↓
ươ structure
```

### Step 6 — state is rendered

```text
tương
```

### Step 7 — adapter returns replacement to jQuery.IME

jQuery.IME replaces the relevant preceding input window according to its normal host behavior.

---

# 46. Example with tone before vowel diacritic

Suppose a valid VNI typing order applies grave before horn.

The surface candidate may temporarily contain a grave tone on the currently available tone-bearing vowel.

The engine should:

```text
parse current rendered state
        ↓
recover semantic tone = GRAVE
        ↓
apply HORN
        ↓
change vowel structure
        ↓
retain tone = GRAVE
        ↓
rerender
        ↓
tone appears at correct new position
```

No explicit history-dependent:

```text
move old mark from character A to character B
```

algorithm is required.

---

# 47. Example with tone replacement

Given:

```text
tường
```

and:

```text
APPLY_TONE(ACUTE)
```

the semantic transformation is:

```text
tone:
GRAVE → ACUTE
```

The renderer then produces:

```text
tướng
```

No other syllable property changes.

---

# 48. Example with tone removal

Given:

```text
tường
```

and:

```text
REMOVE_TONE
```

the semantic transformation is:

```text
tone:
GRAVE → NONE
```

The vowel structure remains:

```text
ươ
```

and the result is:

```text
tương
```

---

# 49. Example with traditional tone placement

Given semantic state corresponding to:

```text
h + medial o + nucleus a
```

with:

```text
tone = GRAVE
```

and:

```text
TonePlacement.TRADITIONAL
```

the renderer produces:

```text
hòa
```

With the same semantic state and:

```text
TonePlacement.REFORMED
```

the renderer produces:

```text
hoà
```

This demonstrates why placement policy belongs to rendering rather than parsing or VNI mapping.

---

# 50. Repeated-key escape architecture

Repeated-key escape requires special care because the second key may need to produce a literal character.

For example:

```text
a1  → á
a11 → a1
```

A conceptual handling sequence may be:

```text
current candidate:
á

incoming VNI command:
1

engine observes:
current semantic tone == ACUTE

adapter/engine escape policy:
undo corresponding tone application
+
emit literal "1"

result:
a1
```

The exact division of responsibility between the adapter and transformation engine will be finalized during implementation.

The key invariant is:

> Escape behavior must not require reconstructing the entire raw typing history when the current rendered state contains enough information.

---

# 51. Regular expressions

Regular expressions are permitted.

They may be useful for:

* candidate boundaries;
* small character classifications;
* compact matching of well-defined local structures.

They should not serve as the primary semantic architecture of Vietnamese composition.

In particular, the implementation should avoid systems where correctness depends on:

```text
regex A must execute before regex B
```

for linguistic reasons.

If two structures overlap, the parser should resolve the ambiguity explicitly.

---

# 52. Lookup tables

Lookup tables are encouraged where they make relationships explicit.

Examples include:

```text
Unicode vowel decomposition table

vowel composition table

onset inventory

ending inventory

nucleus-family spellings

tone restrictions
```

A lookup table is preferable to complicated procedural code when it directly represents stable finite data.

---

# 53. Finite grammar

Vietnamese orthographic structure is sufficiently constrained that much of the engine may be represented through finite inventories and deterministic transformations.

The implementation does not require:

* statistical language modeling;
* machine learning;
* a dictionary;
* natural-language prediction.

The difficult part is composition-state modeling and deterministic ambiguity resolution, not probabilistic inference.

---

# 54. State management

The Vietnamese engine should remain as stateless as practical between keystrokes.

The preferred cycle is:

```text
read current rendered candidate
        ↓
parse
        ↓
transform
        ↓
render
        ↓
discard transient semantic state
```

The next keystroke parses the rendered text again.

Persistent state should be introduced only when a behavior demonstrably cannot be recovered from text plus the incoming command.

---

# 55. Why reparsing is preferred

Reparsing the short current candidate on each command has several advantages:

* Vietnamese syllables are short;
* the grammar is finite;
* different typing sequences can converge naturally;
* external text edits are less likely to desynchronize the engine;
* debugging can begin from visible text;
* tests do not need to reproduce full keystroke history for every semantic operation.

Correctness and simplicity are more important than avoiding a very small parse on each keystroke.

---

# 56. Performance model

VIWP.IME operates on only a short text candidate near the caret.

Therefore the engine should prefer:

```text
simple deterministic parsing
```

over premature micro-optimization.

The implementation should avoid:

* repeatedly scanning large document text;
* large backtracking regular expressions;
* unnecessary DOM operations;
* large lexical dictionaries in the hot path.

Performance should be measured after correctness is established.

---

# 57. Error and fallback handling

When the engine cannot safely interpret a candidate:

```text
UNRECOGNIZED
```

should normally result in pass-through behavior rather than destructive rewriting.

The engine should distinguish:

```text
recognized command but not applicable
```

from:

```text
not a Vietnamese composition
```

where such a distinction affects escape behavior.

The precise result type should be designed explicitly rather than encoded through ambiguous return strings.

---

# 58. Separation of result types

A future implementation may benefit from an explicit result model conceptually similar to:

```text
TransformResult
├── handled
│   └── output
├── passThrough
└── escaped
    └── output
```

This is not a frozen API.

It illustrates that:

```text
"output is unchanged"
```

and:

```text
"the engine did not handle this key"
```

are not always the same event.

The jQuery.IME integration layer already distinguishes processed output from no-op behavior, so VIWP.IME should preserve that semantic distinction.

---

# 59. Packaging inside jQuery.IME

The exact source-file layout is intentionally deferred to Phase 2.

A conceptual layout might resemble:

```text
Vietnamese shared engine
├── orthographic data
├── Unicode helpers
├── parser
├── transformations
├── renderer
└── validation

Input-method adapters
├── VNI
├── Telex
└── VIQR
```

However, this document does not yet prescribe:

```text
rules/vi/...
```

versus:

```text
shared helper files
```

or another packaging arrangement.

The integration spike must first inspect:

* current rule-loading conventions;
* source dependency support;
* test loading;
* build behavior;
* upstream maintenance expectations.

---

# 60. Input-method loading

jQuery.IME supports input methods that reuse portions of other methods when the necessary source dependencies are loaded first.

VIWP.IME should investigate this mechanism before deciding how the shared Vietnamese engine is loaded by VNI, Telex, and VIQR.

Possible designs include:

```text
one shared Vietnamese dependency
+
three adapters
```

or another upstream-compatible arrangement.

The architecture requires shared logic.

It does not require a particular loader implementation.

---

# 61. No core changes by default

The preferred integration boundary is:

```text
existing jQuery.IME extension mechanisms
+
Vietnamese-specific source files
```

The project should not modify:

```text
src/jquery.ime.js
```

merely to obtain a cleaner Vietnamese API.

A proposed core change must meet all of the following conditions:

1. a concrete Vietnamese requirement cannot be implemented correctly using the existing extension mechanisms;
2. the limitation is demonstrated with a minimal reproduction or test;
3. the required change is not merely Vietnamese-specific configuration;
4. the architectural impact is documented;
5. upstream maintainers are consulted before substantial work proceeds.

---

# 62. Core limitation handling

If a limitation is discovered, it should first be recorded as an integration finding.

Conceptually:

```text
Requirement
    ↓
existing jQuery.IME API
    ↓
cannot satisfy requirement
    ↓
minimal failing case
    ↓
documented blocker
    ↓
upstream discussion
```

The Vietnamese engine should not accumulate fragile hacks merely to preserve an absolute no-core-change rule.

At the same time, core changes should remain exceptional.

---

# 63. Test architecture

Testing should follow the same architectural boundaries as production code.

Conceptually:

```text
┌────────────────────────────┐
│ Pure engine tests          │
│                            │
│ parser                     │
│ transformations            │
│ renderer                   │
│ Unicode                    │
│ validation                 │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│ Generated/invariant tests  │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│ jQuery.IME integration     │
│ fixtures                   │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│ Full upstream regression   │
└────────────────────────────┘
```

Large orthographic coverage should be tested primarily against the pure engine rather than through simulated DOM keystrokes.

---

# 64. Testability as an architectural requirement

A Vietnamese orthographic rule is not considered cleanly implemented if it can only be verified by manually typing into a browser.

Core rules should be directly callable from tests.

For example, it should be possible to test something conceptually equivalent to:

```text
parse("tường")
```

or:

```text
applyTone(state, ACUTE)
```

without initializing jQuery.IME.

This does not require these exact public APIs.

---

# 65. Generated tests

Finite grammar data should enable generated test cases.

Examples include:

```text
parse → render round trip

all supported tones over compatible structures

all checked syllable tone restrictions

traditional/reformed placement pairs

equivalent input-command orderings
```

The same grammar data used by the engine should, where practical, be usable to derive coverage tests.

---

# 66. Integration tests

jQuery.IME integration tests should verify representative complete input sequences.

Examples:

```text
VNI raw input
→ expected Vietnamese output
```

Integration tests should focus on the boundary:

```text
jQuery.IME host
↔
Vietnamese adapter
```

They should not duplicate every pure-engine structural test.

---

# 67. Manual playground

The future public playground should load the actual integrated input methods.

It should not contain an alternate or simplified implementation.

This ensures:

```text
manual test behavior
==
production VIWP.IME behavior
```

The playground belongs outside the semantic engine.

---

# 68. Documentation architecture

Documentation is separated by concern:

```text
README.md
→ project scope

terminology.md
→ canonical vocabulary

requirements.md
→ behavioral contract

orthographic-model.md
→ Vietnamese domain model

architecture.md
→ software structure

testing.md
→ test workflow and coverage strategy
```

Implementation details discovered later should not be inserted into the orthographic model unless they change the domain model itself.

---

# 69. Decision records

Significant architectural decisions may be documented under:

```text
docs/vi/decisions/
```

A decision record is appropriate when:

* multiple plausible architectures exist;
* the decision has long-term maintenance impact;
* future developers are likely to ask why the implementation is structured that way.

Likely candidates include:

```text
rendered text as source of truth

shared semantic-command layer

representation of `gi`

Unicode decomposition strategy

shared-source loading strategy

tone-placement policy exposure
```

Not every implementation choice requires a decision record.

---

# 70. Proposed module responsibilities

Without freezing file layout, the architecture recognizes the following logical modules.

## 70.1 Unicode utilities

Responsibilities:

```text
decompose Vietnamese letters
extract tone
extract vowel diacritic
compose vowel output
normalization
```

Must not contain input-method mappings.

---

## 70.2 Orthographic data

Responsibilities:

```text
onset inventory
rime relationships
nucleus families
ending inventory
structural restrictions
precursor relationships
```

Should be declarative where practical.

---

## 70.3 Parser

Responsibilities:

```text
surface candidate
→
composition state
```

Must handle both complete and intermediate states.

---

## 70.4 Transformer

Responsibilities:

```text
composition state
+
semantic command
→
new composition state
```

Must not perform DOM replacement.

---

## 70.5 Tone-placement resolver

Responsibilities:

```text
composition state
+
tone-placement policy
→
tone-bearing position
```

Should remain independent from VNI, Telex, and VIQR.

---

## 70.6 Renderer

Responsibilities:

```text
composition state
→
Unicode surface output
```

Uses tone-placement resolution and Unicode utilities.

---

## 70.7 Validator

Responsibilities:

```text
classify structural state
check tone compatibility
check canonical completeness
```

May initially be permissive.

---

## 70.8 Input-method adapter

Responsibilities:

```text
method-specific key
→
semantic command

jQuery.IME input
↔
shared engine result
```

One adapter exists per supported input method.

---

# 71. Dependency direction

Dependencies should flow primarily in one direction:

```text
jQuery.IME adapter
        ↓
semantic command API
        ↓
Vietnamese engine
        ↓
orthographic model/data
        ↓
Unicode utilities
```

Lower layers must not depend on higher layers.

In particular:

```text
Unicode utilities
```

must not know VNI.

```text
parser
```

must not know jQuery.IME.

```text
renderer
```

must not inspect keyboard events.

---

# 72. Avoid circular responsibilities

The architecture should avoid designs such as:

```text
parser calls VNI adapter

renderer calls parser to guess state

Unicode utility decides tone-placement policy

validator modifies DOM text
```

Each layer should have one clear responsibility.

---

# 73. Public versus internal APIs

The project should avoid prematurely exposing a large public API.

The immediate upstream product is the jQuery.IME input method.

Internal engine functions may remain implementation details.

Nevertheless, internal boundaries should remain clear enough for:

* unit testing;
* maintenance;
* documentation;
* future reuse if appropriate.

---

# 74. Design evolution

This architecture is expected to evolve during implementation.

Changes are acceptable when empirical work reveals that:

* the orthographic model cannot represent a required behavior;
* the jQuery.IME host imposes an unexpected constraint;
* a proposed abstraction creates unnecessary complexity;
* test evidence demonstrates a simpler equivalent model.

Such changes should update this document.

The project should not preserve an architectural abstraction merely because it was proposed before coding began.

---

# 75. Phase 2 integration questions

Before production implementation begins, the integration spike should answer at least the following questions.

### Shared loading

How should one Vietnamese engine be loaded and reused by:

```text
VNI
Telex
VIQR
```

using current jQuery.IME conventions?

### Functional patterns

What is the cleanest way for a Vietnamese adapter to use functional `patterns` while preserving jQuery.IME's expected `noop` and output semantics?

### Input window

What `maxKeyLength` safely covers all required Vietnamese composition candidates without unnecessarily widening replacement scope?

### Context

Can `contextLength` remain zero, or are there narrow escape behaviors that require raw-key context?

### Unicode

How does `maxKeyLength` behave with JavaScript code units for Vietnamese precomposed and decomposed input?

### Testing

What is the cleanest way to unit-test shared engine modules while remaining compatible with the repository's current QUnit/Grunt setup?

### Packaging

Which files should exist in the upstream patch, and which project-only documentation or playground files should remain outside the final PR?

---

# 76. Architectural acceptance criteria

The architecture should be considered successful when the following statements are true.

### One engine

VNI, Telex, and VIQR use one Vietnamese orthographic transformation implementation.

### Thin adapters

Adding another supported Vietnamese typing convention would primarily require command mapping rather than copying linguistic logic.

### Pure core

Vietnamese parsing and transformation can be tested without initializing DOM input elements.

### Deterministic grammar

Correctness does not depend on accidental regular-expression ordering.

### Stateless preference

The current rendered candidate is sufficient to reconstruct composition state for ordinary transformations.

### Semantic tone

Tone exists independently from its visual Unicode location.

### Rendered relocation

Tone placement is recalculated by rendering rather than implemented as historical mark movement.

### Explicit intermediate states

ASCII-like and partially transformed precursors can be represented without pretending they are final Vietnamese orthography.

### Unicode correctness

Canonical Unicode representation does not define the semantic model.

### Host boundary

jQuery.IME remains responsible for input events, caret handling, and text replacement.

### Minimal upstream impact

Vietnamese support can be proposed without unrelated jQuery.IME core changes unless a documented blocker is found.

---

# 77. Summary

The fundamental architectural flow is:

```text
jQuery.IME input
      ↓
input-method adapter
      ↓
semantic command
      ↓
candidate extraction
      ↓
orthographic parser
      ↓
composition state
      ↓
semantic transformation
      ↓
validation
      ↓
tone-placement resolution
      ↓
Unicode renderer
      ↓
jQuery.IME replacement
```

The most important architectural separations are:

```text
input-method syntax
≠
Vietnamese semantics
```

```text
rendered Unicode
≠
composition state
```

```text
tone
≠
tone-mark position
```

```text
parser
≠
validator
```

```text
complete orthography
≠
intermediate composition
```

```text
Vietnamese engine
≠
jQuery.IME host
```

VIWP.IME should therefore be implemented as a small Vietnamese composition engine embedded into jQuery.IME through thin input-method adapters, rather than as three independent collections of transliteration rules.
