# Vietnamese orthographic model

This document defines the written Vietnamese model used by VIWP.IME. It is a practical model for input composition, not a complete linguistic theory or a dictionary.

The engine receives a short candidate near the caret and must answer:

```text
Can this candidate be parsed as Vietnamese composition?
If yes, what semantic state does it represent?
If a command changes that state, how should the result be rendered?
```

## Fundamental model

The core unit is an orthographic syllable:

```text
OrthographicSyllable
├── onset?
├── rime
│   ├── medial?
│   ├── nucleus
│   └── ending?
└── tone
```

This is a domain model. JavaScript data structures may differ if they preserve the same distinctions.

The onset may be absent:

```text
ăn
ai
ở
```

The rime is required. The tone is always present semantically; unmarked Vietnamese has `Tone.NONE`.

## Surface versus semantic state

The rendered text is not the full semantic state.

Example:

```text
tường
```

The engine should be able to represent information equivalent to:

```text
onset:   t
nucleus: ươ
ending:  ng
tone:    GRAVE
```

The grave tone is semantic. Its visible location on `ơ` is a rendering decision.

This separation is required because later commands may change the vowel structure while preserving the tone:

```text
á6 -> ấ
```

## Vietnamese vowels

Modern Vietnamese orthography uses these vowel letters:

```text
a ă â e ê i o ô ơ u ư y
```

The engine must distinguish base vowel identity from tone.

Vowel-diacritic categories:

```text
CIRCUMFLEX: a -> â, e -> ê, o -> ô
BREVE:      a -> ă
HORN:       o -> ơ, u -> ư
```

The engine should represent these categories semantically where useful, but it may also use explicit vowel-letter data for rendering.

## Tone

Tone values:

```text
NONE
ACUTE
GRAVE
HOOK
TILDE
DOT
```

Tone invariants:

* a composition state has at most one semantic tone;
* tone replacement changes the semantic tone value;
* tone removal changes the semantic tone to `NONE`;
* vowel-diacritic changes preserve tone unless the command explicitly removes or replaces it;
* tone placement is part of rendering.

Do not implement a semantic operation named `MOVE_TONE`. The tone does not move; the renderer chooses a new visible target after the structure changes.

## Nucleus families

The parser must recognize simple nuclei and common complex families that affect tone placement.

Simple one-letter nuclei:

```text
a ă â e ê i o ô ơ u ư y
```

IÊ-family:

```text
ia
ya
iê
yê
```

UÔ-family:

```text
ua
uô
```

ƯƠ-family:

```text
ưa
ươ
```

The exact grammar inventory should become machine-readable data as the engine grows. Do not encode the complete model as an ordered list of overlapping regex replacements.

## Tone-target rules

Before policy-specific exceptions, the natural tone target follows the nucleus:

| Structure | Tone target |
| --- | --- |
| simple one-letter nucleus | that vowel letter |
| `ia`, `ya` | first letter |
| `iê`, `yê` | `ê` |
| `ua` | `u` |
| `uô` | `ô` |
| `ưa` | `ư` |
| `ươ` | `ơ` |

Examples:

```text
mía
tiếng
yến
múa
muốn
cửa
tường
```

## Tone-placement policies

The default policy is traditional tone placement.

Traditional and reformed placement are identical for most structures. The main visible difference is open rimes involving an orthographic medial and a simple nucleus:

```text
oa
oe
uy
```

Traditional examples:

```text
hòa
xóa
khỏe
hủy
```

Reformed examples:

```text
hoà
xoá
khoẻ
huỷ
```

When an ending follows, the open-rime exception no longer applies:

```text
hoàn
hoán
ngoạn
huynh
```

Therefore the engine must not use a simple string rule such as "tone on `o` whenever the spelling contains `oa`".

Tone-placement policy must remain independent from VNI, Telex, and VIQR key mapping.

## Onsets

The parser should recognize ordinary Vietnamese onsets where needed for composition and validation, including multi-letter spellings such as:

```text
ch
gh
gi
kh
ng
ngh
nh
ph
qu
th
tr
```

Contextual spellings such as `c/k`, `g/gh`, and `ng/ngh` may become validation data. They should not block the first transformation slice unless a required behavior depends on them.

## Special `qu`

`qu` requires explicit treatment.

In Vietnamese spelling, the `u` in `qu` is not always an ordinary independent vowel. The engine must avoid transforming it as though `q` + `u` were a normal onset plus nucleus in every context.

Examples that must eventually be covered:

```text
quốc
quả
quên
```

The internal representation may model `qu` as a special onset or as onset plus a constrained medial. The chosen representation must be documented once implemented.

## Special `gi`

`gi` also requires explicit treatment.

The `i` in `gi` must not always be treated like an ordinary nucleus vowel.

Examples that must eventually be covered:

```text
già
giếng
gió
```

The required surface behavior is clear; the cleanest internal representation remains an implementation decision.

## Endings and checked syllables

The model uses `ending` for material after the nucleus. An ending may be:

* a consonantal coda, such as `m`, `n`, `ng`, `nh`, `p`, `t`, `c`, `ch`;
* an off-glide written with a vowel letter, where the implementation needs that distinction.

Checked syllables ending in:

```text
-c
-ch
-p
-t
```

are structurally compatible with acute and dot tones in standard Vietnamese orthography.

The engine should represent this constraint, but the first behavior for explicitly incompatible tone commands is unresolved.

## Complete, intermediate, and unrecognized

The parser should return a classification richer than a single Boolean.

Recommended classifications:

```text
UNRECOGNIZED
INTERMEDIATE
STRUCTURALLY_VALID
```

Meanings:

* `UNRECOGNIZED`: leave the candidate unchanged.
* `INTERMEDIATE`: not final Vietnamese spelling, but still composable.
* `STRUCTURALLY_VALID`: complete enough to render as ordinary Vietnamese orthography.

A complete syllable may remain composable. An incomplete candidate may also be composable.

Do not reject an input solely because the current surface form is not valid final Vietnamese if it is a normal intermediate typing state.

## Candidate boundary

The engine operates on a candidate near the caret, not the full document.

Candidate extraction should normally stop at:

* whitespace;
* ordinary punctuation;
* characters outside the relevant Latin/Vietnamese range.

Input-method command keys belong to the adapter. The engine receives the candidate and a semantic command, not the original raw keystroke sequence.

The exact range is constrained by jQuery.IME `maxKeyLength`.

## Unicode model

The engine must support valid Unicode Vietnamese text.

Rendered output should use NFC unless a documented technical reason requires otherwise.

Internally, the parser may use NFD or another decomposition strategy if it simplifies extraction of:

* base vowel;
* vowel diacritic;
* tone mark.

This is an implementation decision, not a user-visible requirement.

The engine must not assume every visible Vietnamese character is one JavaScript code unit.

## Case

Parsing should be structurally case-insensitive. Rendering must preserve the user's intended capitalization.

Examples that should remain structurally equivalent aside from case:

```text
tường
Tường
TƯỜNG
```

Do not duplicate the grammar for uppercase and lowercase forms.

## Validation boundary

Structural validity and lexical validity are separate.

The engine may eventually become stricter about structurally impossible candidates, but it must not require a word dictionary to perform ordinary Vietnamese composition.

Useful validation questions include:

```text
Can this candidate continue composition?
Is it a complete orthographic syllable?
Is its tone compatible with its ending?
Is its spelling canonical?
```

This is different from:

```text
Is this an attested Vietnamese word?
```

The last question is outside the first implementation.

## Source hierarchy

When behavior is uncertain, prefer sources in this order:

1. Unicode for representation and normalization;
2. established descriptions of Vietnamese orthography and syllable structure;
3. educational or linguistic descriptions of spelling conventions;
4. established Vietnamese input-method behavior when the question is typing convention;
5. computational syllable inventories as coverage resources;
6. explicit VIWP.IME decisions when sources do not uniquely determine behavior.

Existing IME behavior should not automatically override Vietnamese orthographic structure. Likewise, a linguistic analysis should not force an awkward implementation if a simpler written-text model produces correct behavior.

## Open modeling questions

These questions must be resolved by implementation experiments or explicit decisions:

* exact machine-readable inventory of medial, nucleus, and ending combinations;
* internal representation of `gi`;
* whether the parser should be NFD-first internally;
* how strict initial structural validation should be;
* behavior for incompatible tone commands on checked syllables;
* treatment of rare, borrowed, dialectal, minority-language, and expressive spellings.
