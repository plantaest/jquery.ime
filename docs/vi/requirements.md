# VIWP.IME requirements

This document defines the user-visible behavior required for Vietnamese input methods in jQuery.IME. It says what the input methods must do; `architecture.md` says how the code is structured.

## Requirement levels

* **MUST**: required for the first upstream-ready implementation.
* **SHOULD**: strongly preferred, but may be delayed if a documented technical constraint appears.
* **MAY**: optional or future behavior.
* **UNRESOLVED**: not safe to implement by guessing; requires an explicit decision or experiment.

## Supported input methods

The first upstream-ready implementation MUST support:

* VNI
* Telex
* VIQR

All three input methods MUST use one shared Vietnamese composition engine. They may decode keys differently, but once a key becomes a semantic command, Vietnamese parsing, transformation, tone placement, validation, and rendering must be shared.

## Core composition behavior

The engine MUST support ordinary modern Vietnamese Quốc Ngữ composition:

* the twelve Vietnamese vowel letters: `a ă â e ê i o ô ơ u ư y`;
* six semantic tone values: none, acute, grave, hook, tilde, dot;
* `đ` and `Đ`;
* uppercase and lowercase input;
* syllables with and without onsets;
* common rime structures and consonantal codas;
* incomplete but composable intermediate states.

The implementation MUST NOT require a dictionary to decide ordinary typing behavior.

## Semantic commands

Input-method adapters MUST translate method-specific keys into these semantic commands where applicable:

```text
APPLY_TONE(tone)
REMOVE_TONE
APPLY_VOWEL_DIACRITIC(vowelDiacritic)
APPLY_D_STROKE
ESCAPE_OR_LITERAL
```

The shared engine, not the adapter, is responsible for applying those commands to the current candidate.

## VNI mapping

The VNI adapter MUST support the following mappings:

| Key | Semantic command |
| --- | --- |
| `1` | `APPLY_TONE(acute)` |
| `2` | `APPLY_TONE(grave)` |
| `3` | `APPLY_TONE(hook)` |
| `4` | `APPLY_TONE(tilde)` |
| `5` | `APPLY_TONE(dot)` |
| `6` | `APPLY_VOWEL_DIACRITIC(circumflex)` |
| `7` | `APPLY_VOWEL_DIACRITIC(horn)` |
| `8` | `APPLY_VOWEL_DIACRITIC(breve)` |
| `9` | `APPLY_D_STROKE` |
| `0` | `REMOVE_TONE` |

Examples:

```text
a1 -> á
a2 -> à
a3 -> ả
a4 -> ã
a5 -> ạ

a6 -> â
e6 -> ê
o6 -> ô

o7 -> ơ
u7 -> ư

a8 -> ă

d9 -> đ
D9 -> Đ
```

## Telex mapping

The Telex adapter MUST support the common Vietnamese Telex operations for tones, vowel diacritics, and `đ`.

The exact first-version mapping table for Telex is UNRESOLVED until implementation work verifies the intended compatibility target. The expected starting point is the common Telex family:

```text
s f r x j      tones
z              tone or mark removal, exact scope unresolved
aa ee oo       circumflex
aw             breve
ow uw w        horn behavior, exact accepted forms unresolved
dd             d-stroke
```

Before Telex behavior is implemented, convert this section into a fixed table with examples and escape behavior.

## VIQR mapping

The VIQR adapter MUST support ordinary VIQR-style commands for tones, vowel diacritics, and `đ`.

The exact first-version VIQR table is UNRESOLVED until implementation work verifies the intended compatibility target. The expected starting point is the common VIQR family:

```text
' ` ? ~ .      tones
^              circumflex
(              breve
+              horn
```

The exact `đ` command and literal escape behavior must be specified before VIQR behavior is implemented. VIQR punctuation keys may also require a jQuery.IME experiment because shifted punctuation can interact with functional `patterns`.

## Tone behavior

Tone commands MUST apply to the appropriate tone-bearing vowel in the current Vietnamese candidate, not simply to the immediately preceding character.

Examples:

```text
tieng1 -> tiếng
hoa2   -> hòa
tuong7 -> tương
```

If a candidate already has a tone, a new tone command MUST replace it. The result MUST contain at most one semantic Vietnamese tone.

Example:

```text
á2 -> à
```

Tone removal MUST remove only the tone and preserve vowel identity.

Example:

```text
tường0 -> tương
```

It must not become:

```text
tuong
```

## Vowel-diacritic behavior

The engine MUST support the three Vietnamese vowel-diacritic categories:

| Vowel diacritic | Supported base transformations |
| --- | --- |
| circumflex | `a -> â`, `e -> ê`, `o -> ô` |
| breve | `a -> ă` |
| horn | `o -> ơ`, `u -> ư` |

Applying a vowel diacritic to a toned vowel MUST preserve the semantic tone when the transformation is valid.

Example:

```text
á6 -> ấ
```

Replacement among vowel-diacritic forms, such as `â <-> ă` or `ô <-> ơ`, is UNRESOLVED. Do not implement broad replacement behavior until the rule is specified with examples.

## Tone placement

The default first-version tone-placement policy MUST be traditional tone placement:

```text
hòa
xóa
hủy
```

The shared engine SHOULD keep tone-placement policy independent from input-method key mapping so that reformed placement can be supported later:

```text
hoà
xoá
huỷ
```

How reformed placement is exposed through jQuery.IME is UNRESOLVED. It may require separate input-method entries if jQuery.IME does not provide a suitable per-method setting.

## Flexible composition

The engine MUST support commands entered after some or all of the current candidate has been typed. Equivalent typing orders SHOULD converge when they express the same valid Vietnamese result.

Examples to cover during implementation:

```text
tone before vowel diacritic
vowel diacritic before tone
commands after a coda
commands on already-rendered Vietnamese text
```

The exact maximum editable range is constrained by jQuery.IME `maxKeyLength` and must be covered by tests.

## Repeated-key escape

Users MUST have a practical way to enter literal characters that would otherwise be interpreted as input commands.

Repeated-key escape SHOULD be supported where it matches the input method's established behavior.

VNI example:

```text
a1  -> á
a11 -> a1
```

The exact behavior for complex candidates and for Telex/VIQR is UNRESOLVED until each adapter has a fixed mapping table.

## Special Vietnamese structures

The implementation MUST handle `qu` explicitly. In Vietnamese spelling, `qu` must not be treated as an ordinary `q` followed by an always-independent vowel `u`.

The implementation MUST handle `gi` explicitly. The `i` in `gi` must not automatically be treated like an ordinary nucleus vowel in every context.

The implementation SHOULD represent checked syllables ending in:

```text
-c
-ch
-p
-t
```

Standard checked syllables are structurally compatible only with acute and dot tones. The exact user-visible behavior for an explicitly incompatible tone command is UNRESOLVED.

## Unicode behavior

The implementation MUST produce valid Unicode Vietnamese text.

Rendered output SHOULD use NFC unless a documented jQuery.IME or browser constraint requires another form.

The engine SHOULD correctly interpret canonically equivalent input where practical. It must not assume that every visible Vietnamese character is one JavaScript code unit.

Normal composition MUST NOT produce malformed combining-mark sequences or duplicated tone marks.

## Non-Vietnamese text

The first priority is correct Vietnamese composition. Conservative protection against all foreign words, code identifiers, or technical text is not required for the first engine slice.

The architecture SHOULD allow stricter structural validation later, but VIWP.IME MUST NOT add a Vietnamese dictionary dependency merely to avoid accidental transformations.

## jQuery.IME compatibility

Vietnamese support SHOULD be implemented through existing jQuery.IME extension mechanisms.

Vietnamese behavior MUST NOT break existing jQuery.IME input methods.

A jQuery.IME core change may be considered only when:

1. a concrete Vietnamese requirement cannot be implemented through existing extension points;
2. the limitation is reproduced by a focused test or manual case;
3. the blocker is documented before a workaround is built.

## Testing requirements

Every stable Vietnamese behavior MUST have automated tests.

Core engine behavior SHOULD be tested without DOM keyboard simulation.

jQuery.IME integration fixtures MUST cover representative complete typing sequences for VNI, Telex, and VIQR.

Tests MUST cover at least:

* tone application and replacement;
* tone removal;
* vowel-diacritic application;
* tone preservation during vowel changes;
* `d`/`đ`;
* flexible command placement;
* repeated-key escape;
* uppercase;
* `qu`;
* `gi`;
* checked-syllable constraints;
* Unicode normalization;
* pass-through behavior for unrecognized input.

Before upstream submission, the complete relevant upstream test suite must pass.
