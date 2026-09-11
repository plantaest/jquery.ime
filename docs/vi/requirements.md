# VIWP.IME requirements

This document defines the user-visible behavior required for Vietnamese input methods in jQuery.IME. It says what the input methods must do; `architecture.md` says how the code is structured.

## Requirement levels

* **MUST**: required for the first stable implementation.
* **SHOULD**: strongly preferred, but may be delayed if a documented technical constraint appears.
* **MAY**: optional or future behavior.
* **UNRESOLVED**: not safe to implement by guessing; requires an explicit decision or experiment.

## Supported input methods

The first stable implementation MUST support:

* VNI
* Telex
* VIQR

The current implementation also supports:

* VIQR* as a VIQR variant using `*` for horn
* reformed tone-placement variants for VNI, Telex, VIQR, and VIQR*

The Vietnamese selector SHOULD show concise method names:

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

All Vietnamese input methods MUST use one shared Vietnamese composition engine. They may decode keys differently, but once a key becomes a semantic command, Vietnamese parsing, transformation, tone placement, validation, and rendering must be shared.

## Current implementation boundary

The current Phase 5 implementation SHOULD be treated as a hardened composition engine for covered modern Vietnamese typing behavior. It supports practical evaluation of VNI, Telex, VIQR, VIQR*, and their reformed tone placement variants in the current jQuery.IME example and test infrastructure.

The current implementation MUST NOT be described as a Vietnamese spell checker, a dictionary backed validator, a broad foreign word detector, a minority language orthography model, or an upstream ready package. Those scopes require explicit future design work.

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
huo7 -> huơ
hua7 -> hưa

a8 -> ă

d9 -> đ
D9 -> Đ
dac9 -> đac
d9ieu62 -> điều
nghech61 -> nghếch
```

## Telex mapping

The Telex adapter MUST support the common Vietnamese Telex operations for tones, vowel diacritics, and `đ`.

The Phase 4 Telex adapter supports this mapping:

| Key or sequence | Semantic command or adapter behavior |
| --- | --- |
| `s` | `APPLY_TONE(acute)` |
| `f` | `APPLY_TONE(grave)` |
| `r` | `APPLY_TONE(hook)` |
| `x` | `APPLY_TONE(tilde)` |
| `j` | `APPLY_TONE(dot)` |
| `z` | `REMOVE_TONE` |
| `aa` | `APPLY_VOWEL_DIACRITIC(circumflex)` on `a` |
| `ee` | `APPLY_VOWEL_DIACRITIC(circumflex)` on `e` |
| `oo` | `APPLY_VOWEL_DIACRITIC(circumflex)` on `o` |
| `aw` | `APPLY_VOWEL_DIACRITIC(breve)` |
| `ow` | `APPLY_VOWEL_DIACRITIC(horn)` on `o` |
| `uw` | `APPLY_VOWEL_DIACRITIC(horn)` on `u` |
| `w` after a candidate with an eligible `o` or `u` target | `APPLY_VOWEL_DIACRITIC(horn)` |
| `w` after a candidate with a covered `ua` precursor | `APPLY_VOWEL_DIACRITIC(horn)` as `ưa` |
| `w` after a candidate with an eligible `a` target whose breve result remains recognized | `APPLY_VOWEL_DIACRITIC(breve)` |
| `o` after a horned `uo`-family candidate | `APPLY_VOWEL_DIACRITIC(circumflex)` |
| `dd` | `APPLY_D_STROKE` |
| `d` after a candidate with an initial `d` target | `APPLY_D_STROKE` |

Examples:

```text
as       -> á
af       -> à
aa       -> â
aw       -> ă
cow      -> cơ
thuw     -> thư
thaya    -> thây
thayas   -> thấy
thangw   -> thăng
thangws  -> thắng
haamw    -> hăm
hoposw   -> hớp
thayw    -> thayw
quocos   -> quốc
gienges  -> giếng
thuongw  -> thương
thuongwf -> thường
huopwso  -> huốp
huaws    -> hứa
hoaos    -> hoáo
hoeos    -> hoéo
dd       -> đ
dacds    -> đác
tieengs  -> tiếng
Vieetj   -> Việt
dduwowngf -> đường
mats     -> mát
matj     -> mạt
matf     -> matf
matx     -> matx
toansz   -> toan
w        -> w
[        -> [
]        -> ]
```

Telex does not infer IÊ-family vowel diacritics from unmarked `ie`, `ye`, or `uye`. Type the vowel diacritic explicitly, such as `Vieetj -> Việt`.

Telex vowel-diacritic commands SHOULD also work after later rime material has already been typed when the current rendered candidate identifies a compatible target. For example, `thayas -> thấy` is the delayed form of applying circumflex to `thay`; it is not tone placement over the literal candidate `thaya`. Delayed Telex `w` for breve is constrained by structural recognition: it should apply when the resulting candidate remains recognized, such as `thangw -> thăng` and `haamw -> hăm`, but remain literal when the breve result would create an unrecognized rime, such as `thayw`.

Telex delayed-command detection SHOULD prefer literal input when the full candidate including the latest key is already a recognized Vietnamese composition structure. For example, `hoaos -> hoáo` and `hoeos -> hoéo` keep the final `o` as part of the rime before the tone key applies, without requiring `oao` and `oeo` to be hard-coded in the Telex adapter.

Telex `z` MUST remove only the semantic tone, matching VNI `0`. It MUST preserve vowel diacritics and complex nuclei.

## VIQR mapping

The VIQR adapter MUST support ordinary VIQR-style commands for tones, vowel diacritics, and `đ`.

The Phase 4 VIQR adapter supports this mapping:

| Key or sequence | Semantic command or adapter behavior |
| --- | --- |
| `'` | `APPLY_TONE(acute)` |
| `` ` `` | `APPLY_TONE(grave)` |
| `?` | `APPLY_TONE(hook)` |
| `~` | `APPLY_TONE(tilde)` |
| `.` | `APPLY_TONE(dot)` |
| `0` | `REMOVE_TONE` |
| `^` | `APPLY_VOWEL_DIACRITIC(circumflex)` |
| `(` | `APPLY_VOWEL_DIACRITIC(breve)` |
| `+` | `APPLY_VOWEL_DIACRITIC(horn)` |
| `dd` | `APPLY_D_STROKE` |
| `d` after a candidate with an initial `d` target | `APPLY_D_STROKE` |
| `\` before a covered VIQR command key | literal escaped key |

Examples:

```text
a'        -> á
a`        -> à
a?        -> ả
a~        -> ã
a.        -> ạ
a^        -> â
a(        -> ă
o+        -> ơ
dd        -> đ
dacd'     -> đác
tie^'ng   -> tiếng
Vie^.t    -> Việt
ddu+o+`ng -> đường
tan?      -> tản
tan\?     -> tan?
toan'0    -> toan
```

VIQR punctuation commands MUST work through functional `patterns` and through the `patterns_shift` bridge used by physical shifted keys such as `?`, `~`, `^`, `(`, and `+`.

VIQR delayed `d`-stroke SHOULD work after later rime material has already been typed when the current rendered candidate identifies an initial `d` target, such as `dacd' -> đác`. This does not add repeated-key escape for VIQR `d`; VIQR's escape behavior remains backslash-based for covered command punctuation.

## VIQR* mapping

VIQR* MUST reuse the VIQR adapter behavior except that `*` replaces `+` for horn.

Examples:

```text
u*        -> ư
o*        -> ơ
ddu*o*`ng -> đường
dacd'     -> đác
tan\?     -> tan?
o\*       -> o*
```

VIQR* MUST use the same shifted-key bridge for `?`, `~`, `^`, `(`, and `*`.

## Tone behavior

Tone commands MUST apply to the appropriate tone-bearing vowel in the current Vietnamese candidate, not simply to the immediately preceding character.

Examples:

```text
coi4     -> cõi
kheo1    -> khéo
hoa2     -> hòa
tuong72  -> tường
quoc61   -> quốc
gieng61  -> giếng
huya1    -> huýa
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

The engine supports narrow same-base vowel-diacritic switches on the same target:

```text
hâm8 -> hăm
hăm6 -> hâm
hốp7 -> hớp
hớp6 -> hốp
```

Broad replacement among unrelated vowel-diacritic forms remains UNRESOLVED. Do not implement arbitrary replacement behavior until the rule is specified with examples.

The first VNI implementation supports the narrow `uô <-> ươ` family switch needed for equivalent composition order:

```text
huop61  -> huốp
huop71  -> hướp
huop617 -> hướp
huop716 -> huốp
hua7    -> hưa
```

This does not imply broad arbitrary replacement among all vowel-diacritic forms.

## Tone placement

The default tone-placement policy MUST be traditional tone placement:

```text
hòa
xóa
hủy
```

The shared engine MUST keep tone-placement policy independent from input-method key mapping. Reformed placement is exposed through separate `-reformed` input-method variants:

```text
vi-vni-reformed
vi-telex-reformed
vi-viqr-reformed
vi-viqr-star-reformed
```

The core policy difference is limited to open `oa`, `oe`, and `uy` rimes in the current engine:

```text
traditional: hoa2 -> hòa
reformed:    hoa2 -> hoà

traditional: khoe3 -> khỏe
reformed:    khoe3 -> khoẻ

traditional: huy3 -> hủy
reformed:    huy3 -> huỷ
```

When an ending follows, both policies SHOULD converge:

```text
hoan2  -> hoàn
huynh2 -> huỳnh
```

## Flexible composition

The engine MUST support commands entered after some or all of the current candidate has been typed. Equivalent typing orders SHOULD converge when they express the same valid Vietnamese result.

Examples to cover during implementation:

```text
tone before vowel diacritic
vowel diacritic before tone
commands after a coda
commands on already-rendered Vietnamese text
```

VNI examples:

```text
thay61 -> thấy
thay16 -> thấy
quoc61 -> quốc
gieng61 -> giếng
dac91  -> đác
huop617 -> hướp
huop716 -> huốp
to1an  -> toán
hoa2n  -> hoàn
```

Telex examples:

```text
thayas   -> thấy
thangws  -> thắng
haamw    -> hăm
hoposw   -> hớp
huaws    -> hứa
hoaos    -> hoáo
hoeos    -> hoéo
quocos   -> quốc
gienges  -> giếng
thuongwf -> thường
mats     -> mát
matj     -> mạt
matf     -> matf
matx     -> matx
```

If a candidate already has a tone and the user extends it with ordinary letters, the engine SHOULD reflow the tone when the resolved tone target changes. For example, `to1an -> toán` and `hoa2n -> hoàn`. This reflow MUST still respect the current parsed structure: `thay1 -> tháy` remains a valid intermediate result, because `thày` is a possible Vietnamese spelling and the user may continue with an explicit vowel-diacritic command if they want `thấy`.

The exact maximum editable range is constrained by jQuery.IME `maxKeyLength` and must be covered by tests.

## Repeated-key escape

Users MUST have a practical way to enter literal characters that would otherwise be interpreted as input commands.

Repeated-key escape SHOULD be supported where it matches the input method's established behavior.

VNI example:

```text
a1  -> á
a11 -> a1
a66 -> a6
d99 -> d9
dac99 -> dac9
```

For VNI, repeated-key escape MUST reconstruct from rendered text rather than raw key history. For example, the second `1` in `a11` is processed when the visible candidate is already `á`.

For multi-vowel candidates, repeated-key escape MUST NOT fire while the same command can still apply to another eligible unmarked vowel in the candidate. This preserves explicit extended spellings such as:

```text
lo6o62ng -> lôồng
```

VNI `9` SHOULD also be able to apply to an initial `d` after later rime material has been typed, so equivalent orders such as `d9ac1` and `dac91` converge to `đác`.

Telex uses repeated-key escape for covered command keys:

```text
as  -> á
ass -> as
aa  -> â
aaa -> aa
uw  -> ư
uww -> uw
thuongw  -> thương
thuongww -> thuongw
dd  -> đ
ddd -> dd
```

VIQR and VIQR* use backslash escape for covered command keys:

```text
tan?   -> tản
tan\?  -> tan?
a^     -> â
a\^    -> a^
o*     -> ơ
o\*    -> o*
```

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

Standard checked syllables are structurally compatible only with acute and dot tones.

For the first VNI implementation, incompatible tone commands on checked syllables MUST pass through unchanged. This avoids rendering nonstandard checked-tone forms while keeping the user's literal command available.

## Unicode behavior

The implementation MUST produce valid Unicode Vietnamese text.

Rendered output SHOULD use NFC unless a documented jQuery.IME or browser constraint requires another form.

The engine SHOULD correctly interpret canonically equivalent input where practical. It must not assume that every visible Vietnamese character is one JavaScript code unit.

Normal composition MUST NOT produce malformed combining-mark sequences or duplicated tone marks.

## Non-Vietnamese text

The first priority is correct Vietnamese composition. Conservative protection against all foreign words, code identifiers, or technical text is not required for the first engine slice.

The architecture SHOULD allow stricter structural validation later, but VIWP.IME MUST NOT add a Vietnamese dictionary dependency merely to avoid accidental transformations.

Phase 5 structural-validation hardening SHOULD pass through a continuous Latin candidate when its written structure is impossible as one Vietnamese orthographic syllable in the current model.

Covered Telex examples:

```text
droid      -> droid
david      -> david
browser    -> browser
nodejs     -> nodejs
washington -> washington
```

These examples are regression coverage, not a runtime dictionary. They are protected because their candidate structure violates the orthographic model, such as a rime beginning with an unsupported consonant, a consonant inserted between vowel letters, or a suffix that is not a Vietnamese ending.

This hardening MUST preserve Vietnamese near-neighbor behavior:

```text
dacds   -> đác
thayas  -> thấy
quocos  -> quốc
gienges -> giếng
```

VIWP.IME does not attempt to infer user intent when a raw Telex sequence is structurally ambiguous. For example, `bar` and `gas` may still compose because `ba` and `ga` are Vietnamese candidates before the final Telex tone key. Strong Telex sequences such as `aa`, `ee`, `oo`, `aw`, `ow`, `uw`, and `dd` may also still compose when their command interpretation is structurally valid.

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

jQuery.IME integration fixtures MUST cover representative complete typing sequences for VNI, Telex, VIQR, and VIQR*.

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

Before closing a milestone, the complete relevant repository test suite must pass.
