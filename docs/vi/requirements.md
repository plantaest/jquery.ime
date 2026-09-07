# VIWP.IME Requirements

This document defines the behavioral requirements for the Vietnamese input methods implemented by VIWP.IME.

It specifies **what the input methods must do**, not how the implementation must achieve those behaviors.

Software architecture, parsing strategy, Unicode representation, and jQuery.IME integration details are documented separately.

## 1. Scope

VIWP.IME initially targets three Vietnamese input methods:

* VNI
* Telex
* VIQR

These input methods must share the same underlying Vietnamese composition behavior wherever possible.

The project does not initially target:

* automatic input-method detection;
* VIQR*;
* extended or non-standard Telex variants;
* complete compatibility with every historical behavior of AVIM, UniKey, or other Vietnamese input software;
* a separate platform or browser compatibility policy beyond jQuery.IME itself.

## 2. Requirement levels

This document uses the following requirement levels:

* **MUST** — required for the implementation to be considered complete;
* **SHOULD** — strongly preferred unless a documented technical reason prevents it;
* **MAY** — optional behavior that may be added without being required for the first upstream version.

## 3. General behavior

### 3.1 Vietnamese composition

The input methods MUST support composition of ordinary modern Vietnamese orthography.

The implementation MUST support:

* Vietnamese vowel letters;
* Vietnamese tone marks;
* `đ` and `Đ`;
* uppercase and lowercase text;
* syllables with and without an onset;
* common Vietnamese rime structures;
* structurally valid syllables with consonantal codas;
* Vietnamese-specific spelling behavior required for correct composition.

### 3.2 Shared behavior across input methods

VNI, Telex, and VIQR MUST produce equivalent Vietnamese output when they express the same semantic operation.

For example, the following method-specific commands all represent the acute tone:

```text id="wgj0y7"
VNI:    1
Telex:  s
VIQR:   '
```

The resulting tone-placement and Vietnamese orthographic behavior MUST be shared rather than independently defined per input method.

## 4. Tone input

### 4.1 Supported tones

The implementation MUST support all six Vietnamese tone values:

```text id="k51t39"
NONE
ACUTE
GRAVE
HOOK
TILDE
DOT
```

The five marked tones correspond to:

```text id="bptmw9"
acute  → sắc
grave  → huyền
hook   → hỏi
tilde  → ngã
dot    → nặng
```

### 4.2 VNI tone commands

The VNI adapter MUST support:

```text id="o50akd"
1 → acute
2 → grave
3 → hook
4 → tilde
5 → dot
```

Examples:

```text id="6e9pwr"
a1 → á
a2 → à
a3 → ả
a4 → ã
a5 → ạ
```

### 4.3 Tone application

A tone command MUST apply to the appropriate tone-bearing vowel of the current Vietnamese composition candidate.

The implementation MUST NOT simply apply the tone mark to the immediately preceding character.

Example:

```text id="u6ux7h"
tieng1 → tiếng
```

rather than producing an incorrectly placed tone.

### 4.4 Tone replacement

If the current syllable already has a tone, a new tone command MUST replace the existing tone.

Example:

```text id="qhbaw3"
á2 → à
```

A tone command MUST NOT stack multiple Vietnamese tone marks on the same syllable.

### 4.5 Repeated-key escape for tones

Repeating the same tone command SHOULD undo the immediately corresponding Vietnamese transformation and preserve a literal command character.

Example in VNI:

```text id="syr2q1"
a1  → á
a11 → a1
```

This behavior is important for mixed technical text such as:

```text id="275ogi"
a11y
```

The exact behavior in more complex compositions MUST be defined consistently and covered by tests.

## 5. Tone removal

### 5.1 Dedicated tone-removal command

Each supported input method SHOULD provide its conventional tone-removal behavior where such behavior exists.

For VNI, the command MUST be:

```text id="hj7ccg"
0 → REMOVE_TONE
```

### 5.2 Tone removal semantics

Tone removal MUST remove the tone while preserving Vietnamese vowel letters and other orthographic properties.

Example:

```text id="wjdi7d"
tường0 → tương
```

It MUST NOT behave as a general reset of all Vietnamese diacritics.

For example:

```text id="lcm54b"
tường0
```

must not become:

```text id="zc7dc3"
tuong
```

### 5.3 No-tone input

Applying tone removal to a syllable that currently has no tone SHOULD leave the relevant Vietnamese spelling unchanged unless the input method defines an escape behavior for that sequence.

## 6. Vietnamese vowel diacritics

### 6.1 Supported vowel diacritics

The implementation MUST support the three Vietnamese vowel-diacritic categories:

```text id="8wwywh"
circumflex
breve
horn
```

These produce the following Vietnamese vowel letters:

```text id="fmddbz"
circumflex:
a → â
e → ê
o → ô

breve:
a → ă

horn:
o → ơ
u → ư
```

### 6.2 VNI vowel-diacritic commands

The VNI adapter MUST support:

```text id="p11543"
6 → circumflex
7 → horn
8 → breve
```

Examples:

```text id="vxenkw"
a6 → â
e6 → ê
o6 → ô

o7 → ơ
u7 → ư

a8 → ă
```

### 6.3 Preserve tone while changing vowel diacritics

Applying a vowel diacritic to a vowel that already carries a tone MUST preserve the tone where the transformation is valid.

Example:

```text id="e2mbph"
á6 → ấ
```

Conceptually, the operation changes the vowel structure while the tone remains acute.

### 6.4 Diacritic replacement

Where Vietnamese input conventions reasonably allow one vowel-diacritic form to replace another, the shared engine SHOULD support deterministic replacement behavior.

Examples may include transformations between:

```text id="mpwg7z"
â ↔ ă
ô ↔ ơ
```

when the input sequence explicitly requests such a change.

The precise replacement rules must be documented and tested before being treated as stable behavior.

## 7. D with stroke

### 7.1 VNI d-stroke command

The VNI adapter MUST support:

```text id="0wt792"
9 → d-stroke
```

Examples:

```text id="lgpz72"
d9 → đ
D9 → Đ
```

### 7.2 Flexible command position

The d-stroke command SHOULD work when entered after additional characters in the current composition candidate, provided the intended `d` or `D` remains unambiguous.

Examples such as:

```text id="ngmr6b"
da9
dai9
```

SHOULD be handled consistently with the project's general flexible-composition policy.

The exact maximum editable range is constrained by jQuery.IME integration and is not specified here.

### 7.3 Repeated-key escape

Repeated use of the d-stroke command SHOULD provide a reasonable literal-input escape analogous to other Vietnamese input commands.

The exact sequence behavior must be documented by the input-method specification.

## 8. Flexible command placement

### 8.1 General requirement

VIWP.IME MUST support Vietnamese typing in which tone and vowel-diacritic commands are not restricted to one single canonical keystroke position.

Users SHOULD be able to enter a command after some or all of the current rime has already been typed.

The engine should interpret the current composition state rather than depend only on direct adjacent key replacement.

### 8.2 Equivalent composition orders

Different input sequences that express the same intended Vietnamese composition SHOULD converge to the same output.

For example, where valid:

```text id="l9l8ng"
vowel modification before tone
```

and:

```text id="xx4n1p"
tone before vowel modification
```

SHOULD produce the same final Vietnamese syllable.

Using VNI conceptually:

```text id="igwi2c"
...72
...27
```

should converge where both sequences represent the same intended orthographic result.

### 8.3 Intermediate states

The engine MUST support valid intermediate composition states.

An intermediate state may not itself be a complete Vietnamese orthographic syllable.

It MUST NOT be rejected merely because it is not valid as final text if additional input can transform it into a valid Vietnamese structure.

## 9. Tone relocation

### 9.1 Recalculation after structural changes

If later input changes the vowel structure of a syllable, the implementation MUST recalculate the correct tone-mark position.

The semantic tone MUST remain unchanged unless the user explicitly replaces or removes it.

Conceptually:

```text id="yxglqt"
current syllable
+
new vowel-diacritic operation
        ↓
new vowel structure
        ↓
recalculate tone placement
```

### 9.2 No duplicated tone marks

Tone relocation MUST NOT leave the previous tone mark behind.

The final rendered syllable must contain at most one Vietnamese tone mark.

## 10. Tone-placement policies

### 10.1 Default policy

The initial default tone-placement policy MUST be the traditional convention used by forms such as:

```text id="vpzi4n"
hòa
xóa
hủy
```

### 10.2 Reformed policy

The shared engine SHOULD be designed so that it can also support the reformed placement convention:

```text id="8wymv8"
hoà
xoá
huỷ
```

### 10.3 Separation from input method

Tone-placement policy SHOULD be independent from VNI, Telex, or VIQR key mapping.

Conceptually:

```text id="x4gn2x"
input method
+
tone-placement policy
```

should be separate dimensions.

### 10.4 jQuery.IME exposure

How the reformed policy is exposed through jQuery.IME remains an integration decision.

Possible approaches may include separate input-method entries such as:

```text id="nm7cv5"
Vietnamese VNI
Vietnamese VNI (reformed tone placement)
```

but this document does not require a particular UI representation.

## 11. Checked syllables

Vietnamese syllables ending orthographically in:

```text id="chys8e"
-c
-ch
-p
-t
```

are restricted to the sắc and nặng tones in standard Vietnamese orthography.

The engine SHOULD represent this structural constraint.

For example, the implementation should not freely construct impossible checked-syllable tone combinations as though all six tones were structurally equivalent.

The exact behavior when a user explicitly requests an incompatible tone remains an orthographic-validation policy decision.

## 12. Special orthographic structures

### 12.1 `qu`

The implementation MUST correctly handle Vietnamese spellings involving `qu`.

`qu` MUST NOT be treated as though every occurrence of `u` were necessarily an ordinary independent vowel nucleus component.

The orthographic model must define its behavior explicitly.

### 12.2 `gi`

The implementation MUST correctly handle Vietnamese spellings involving `gi`.

The `i` in `gi` MUST NOT automatically be interpreted in the same way as an ordinary nucleus vowel in all contexts.

The orthographic model must define its behavior explicitly.

### 12.3 Other orthographic alternations

Other spelling-dependent structures, including onset alternations such as:

```text id="eql9ak"
g / gh
ng / ngh
c / k / q
```

MAY be represented where required for structural validation or composition behavior.

VIWP.IME is not required to implement a complete Vietnamese spelling checker.

## 13. Uppercase and mixed case

### 13.1 Uppercase support

All Vietnamese transformations MUST support uppercase equivalents.

Examples:

```text id="4kv9fl"
A1 → Á
A6 → Â
D9 → Đ
```

### 13.2 Case preservation

Composition SHOULD preserve the user's intended capitalization.

The engine MUST NOT lowercase unrelated letters while applying Vietnamese transformations.

### 13.3 Mixed case

Mixed-case input SHOULD remain predictable.

Strict linguistic validation of unusual capitalization is not required.

## 14. Non-Vietnamese input

### 14.1 Initial priority

The first implementation priority is correct Vietnamese composition.

Strict avoidance of all unintended transformations in foreign-language or technical text is NOT a Phase 1 requirement.

### 14.2 Architecture requirement

The architecture SHOULD allow later conservative orthographic validation to reduce unwanted transformations in clearly non-Vietnamese input.

### 14.3 No dictionary requirement

VIWP.IME MUST NOT require a Vietnamese lexical dictionary merely to determine ordinary composition behavior.

Structural validity and lexical validity must remain separate concepts.

## 15. Escape behavior

### 15.1 Purpose

Users MUST have a practical way to enter characters that would otherwise be interpreted as Vietnamese input commands.

### 15.2 Repeated-key escape

Repeated-key escape SHOULD be supported where consistent with common input-method behavior.

Example:

```text id="kr8t2c"
a1  → á
a11 → a1
```

### 15.3 Literal technical text

Escape behavior SHOULD make common mixed technical strings practical to type without disabling the input method.

Example:

```text id="7w9d35"
a11y
```

should be reasonably enterable.

### 15.4 Method-specific behavior

Escape behavior MAY differ between VNI, Telex, and VIQR where their established input conventions differ.

The shared Vietnamese engine should nevertheless expose consistent semantic operations where possible.

## 16. Unicode behavior

### 16.1 Correct Unicode output

The implementation MUST produce valid Unicode Vietnamese text.

### 16.2 Canonical normalization

Final rendered output SHOULD use a consistent canonical Unicode normalization form.

NFC is the preferred target unless a jQuery.IME constraint or documented technical reason requires otherwise.

### 16.3 Canonically equivalent input

Where practical, the engine SHOULD correctly interpret canonically equivalent Unicode input representations.

The implementation must not assume that every visible Vietnamese character is necessarily represented by one JavaScript code unit.

### 16.4 No malformed combining sequences

The implementation MUST avoid producing malformed or duplicated combining-mark sequences through normal composition.

## 17. jQuery.IME integration

### 17.1 Core modification

VIWP.IME SHOULD be implemented without modifying jQuery.IME core.

A core modification may be considered only if a concrete integration blocker is demonstrated and documented.

### 17.2 Shared implementation

Vietnamese-specific shared logic SHOULD be reused by all three target input methods.

### 17.3 Existing framework behavior

VIWP.IME does not independently define browser, operating-system, editor, or mobile support.

Such behavior is inherited from jQuery.IME.

### 17.4 Existing input methods

The Vietnamese implementation MUST NOT break existing jQuery.IME input methods.

The complete upstream test suite must remain green before upstream submission.

## 18. Testing requirements

### 18.1 Behavioral tests

Every stable input behavior MUST be represented by automated tests.

### 18.2 Unit-testable engine

Core Vietnamese transformation behavior SHOULD be testable independently from DOM keyboard events.

### 18.3 Integration fixtures

The project MUST include jQuery.IME integration fixtures for VNI, Telex, and VIQR.

### 18.4 Representative composition orders

Tests MUST cover more than canonical typing order.

They should include representative cases involving:

* tone before vowel diacritic;
* vowel diacritic before tone;
* commands entered before and after codas;
* tone replacement;
* tone removal;
* repeated-key escape;
* uppercase;
* `qu`;
* `gi`;
* checked syllables;
* intermediate states.

### 18.5 Full regression suite

Before an upstream pull request is considered ready, the complete jQuery.IME test suite MUST pass.

## 19. Documentation requirements

### 19.1 Developer documentation

The project MUST document:

* canonical terminology;
* behavioral requirements;
* Vietnamese orthographic model;
* software architecture;
* testing strategy;
* input-method mappings.

Developer documentation SHOULD be written primarily in English.

### 19.2 User documentation

Before user-facing deployment, the project SHOULD provide documentation explaining how to use:

* VNI;
* Telex;
* VIQR;
* tone removal;
* escape behavior;
* supported tone-placement policy or policies.

User documentation is expected to be written in Vietnamese first.

## 20. Public testing environment

The project SHOULD provide a small public browser-based playground for manual evaluation.

The playground SHOULD:

* load the actual VIWP.IME implementation;
* allow switching among supported Vietnamese input methods;
* provide at least one editable text area;
* remain simple enough to deploy as a static site where practical.

The playground is not a substitute for automated tests.

## 21. Upstream readiness

The implementation is considered ready for upstream proposal only when:

* VNI, Telex, and VIQR are implemented;
* the shared Vietnamese engine is stable;
* required behavioral tests pass;
* the complete jQuery.IME regression suite passes;
* developer documentation is sufficient for review;
* user-visible behavior is documented;
* no unexplained jQuery.IME core modifications are required;
* the implementation has received adequate manual testing.

## 22. Deferred or open questions

The following matters are intentionally not fully specified yet.

### 22.1 Strict orthographic validation

How aggressively the input method should reject or avoid transformations in structurally invalid or obviously non-Vietnamese strings remains open.

Initial priority:

```text id="clml60"
correct Vietnamese composition first
```

### 22.2 Incompatible tone on checked syllables

The exact user-visible behavior when a user explicitly requests an impossible checked-syllable tone remains open.

Possible behaviors include:

* ignore the command;
* preserve it literally;
* escape the composition;
* allow the intermediate state but reject it as final Vietnamese composition.

This must be resolved before finalizing orthographic validation.

### 22.3 Vowel-diacritic replacement semantics

Exact repeated or replacement behavior for combinations such as:

```text id="0mo5ln"
â ↔ ă
ô ↔ ơ
```

must be specified after comparing established VNI/Telex behavior.

### 22.4 Reformed tone-placement exposure

The engine should support the policy if practical, but whether it appears as:

* separate input methods;
* some future per-input-method option;
* or another upstream-compatible mechanism

remains open.

### 22.5 Maximum composition range

How far backward from the caret the engine can or should reinterpret text depends partly on jQuery.IME integration behavior.

This should be measured during the integration spike rather than fixed prematurely.

## 23. Summary of mandatory first-version behavior

At minimum, the first upstream-ready VIWP.IME implementation must provide:

```text id="i5ri2n"
VNI
Telex
VIQR

shared Vietnamese composition engine

tone input
tone replacement
tone removal
vowel-diacritic input
d/đ transformation

flexible command placement
intermediate composition states
tone relocation

traditional tone placement

uppercase and lowercase support
repeated-key escape

correct qu/gi handling

Unicode-correct output

automated tests
jQuery.IME integration tests
full upstream regression compatibility
```

Features such as strict foreign-word protection, lexical validation, advanced configuration, and alternate tone-placement exposure may be refined after the core Vietnamese composition engine is proven correct.
