# Vietnamese IME Terminology

This document defines the canonical terminology used by VIWP.IME in source code and developer documentation.

The purpose is not to establish a comprehensive linguistic description of Vietnamese. VIWP.IME is an input-method project, so terminology is chosen primarily for:

* technical precision;
* consistency with established linguistic and Unicode terminology;
* usefulness when describing Vietnamese orthography;
* clarity in source code and tests.

Where linguistic analyses differ, this document defines the convention used by VIWP.IME.

## General principles

### Orthography is the primary model

VIWP.IME operates on written Vietnamese.

The engine therefore uses an **orthographic model** rather than attempting to represent Vietnamese phonology in full.

Terms such as `onset`, `nucleus`, `coda`, and `rime` are used to describe useful structural parts of a written Vietnamese syllable. They should not be interpreted as claiming that the software implements a complete phonological analysis.

### Semantic concepts and written marks are distinct

The project distinguishes a linguistic or semantic property from the Unicode mark used to display it.

For example:

```text
tone
    ↓ represented orthographically by
tone mark
```

Similarly, the engine should distinguish a semantic vowel property from the particular Unicode representation used to encode it.

### Canonical source-code terminology is English

English terms in this document are canonical for:

* source-code identifiers;
* developer documentation;
* tests;
* architecture discussions.

Vietnamese equivalents are provided primarily to clarify meaning.

---

# Core structural terminology

## Orthographic syllable

**Canonical term:** `orthographic syllable`

**Vietnamese:** âm tiết chính tả

An orthographic syllable is the primary written unit that the Vietnamese engine attempts to interpret and transform.

Examples:

```text
a
ăn
hòa
tường
nghiêng
quốc
```

An orthographic syllable is not necessarily identical to a phonological syllable representation.

When the distinction is unimportant, developer documentation may use the shorter term `syllable`.

Prefer `orthographic syllable` when discussing the formal model.

---

## Onset

**Canonical term:** `onset`

**Vietnamese:** âm đầu; phụ âm đầu

The onset is the initial part of a syllable preceding the rime.

Examples:

```text
ba       → onset: b
thanh    → onset: th
nghiêng  → onset: ngh
```

A syllable may have no onset:

```text
ăn
ai
ở
```

Special spellings involving `qu` and `gi` require explicit treatment in the orthographic model and should not be inferred solely from ordinary onset rules.

Do not use `prefix` for this concept.

---

## Rime

**Canonical term:** `rime`

**Vietnamese:** vần

The rime is the part of the syllable following the onset.

Conceptually:

```text
syllable
├── onset
└── rime
```

The rime contains at least a nucleus and may include additional elements such as a coda or an orthographic glide.

Examples:

```text
ban      → rime: an
tường    → rime: ường
nghiêng  → rime: iêng
```

### `rime` versus `rhyme`

Both spellings occur in linguistic literature.

VIWP.IME uses **`rime`** consistently for the structural linguistic unit in order to distinguish it from the everyday meaning of poetic rhyme.

Do not mix `rime` and `rhyme` in code or project documentation.

---

## Nucleus

**Canonical term:** `nucleus`

**Vietnamese:** âm chính; hạt nhân

The nucleus is the central vowel-bearing part of the rime.

It is especially important to VIWP.IME because the structure of the nucleus participates in:

* vowel-diacritic transformation;
* tone placement;
* validation of syllable structure.

Examples may involve one or more written vowel letters.

The exact inventory and parsing rules are defined in `orthographic-model.md`.

Do not use `main vowel` as a canonical source-code term.

---

## Coda

**Canonical term:** `coda`

**Vietnamese:** âm cuối

The coda is the final component of a rime following the nucleus when such a component is present.

Examples include orthographic endings such as:

```text
-m
-n
-ng
-nh
-p
-t
-c
-ch
```

Some Vietnamese rimes end in vowel letters conventionally analyzed as glides rather than consonantal codas. VIWP.IME should not force all orthographic endings into `coda` merely for implementation convenience.

The exact representation is defined by the orthographic model.

Do not use `suffix` for this concept.

---

## Glide

**Canonical term:** `glide`

**Vietnamese:** âm lướt; bán nguyên âm, depending on context

A glide is a non-syllabic vowel-like component associated with the rime.

The term may be useful when distinguishing structures such as vowel nuclei from final or medial glide behavior.

VIWP.IME does not require every linguistic analysis of Vietnamese glides to be reproduced exactly.

If the engine uses an implementation-specific representation such as `medial` or `offglide`, that representation must be explicitly defined in `orthographic-model.md` rather than assumed from this terminology document.

---

## Medial

**Canonical term:** `medial`

**Vietnamese:** âm đệm

`Medial` may be used when the orthographic model needs to represent an element between the onset and nucleus, particularly structures traditionally described in Vietnamese grammar as containing an âm đệm.

However, VIWP.IME should not assume that every written `u` or `o` before another vowel is automatically a medial.

The exact role of `medial` remains a modeling decision for `orthographic-model.md`.

---

# Tone terminology

## Tone

**Canonical term:** `tone`

**Vietnamese:** thanh điệu

A tone is a semantic property of a Vietnamese syllable.

VIWP.IME recognizes six tone values:

```text
NONE
ACUTE
GRAVE
HOOK
TILDE
DOT
```

These correspond to:

| Canonical value | Vietnamese name | Common written example |
| --------------- | --------------- | ---------------------- |
| `NONE`          | thanh ngang     | a                      |
| `ACUTE`         | thanh sắc       | á                      |
| `GRAVE`         | thanh huyền     | à                      |
| `HOOK`          | thanh hỏi       | ả                      |
| `TILDE`         | thanh ngã       | ã                      |
| `DOT`           | thanh nặng      | ạ                      |

`NONE` represents the absence of a written tone mark and should not be confused with the absence of tone as a linguistic property.

The engine should represent tone independently from the particular vowel letter on which its mark is rendered.

---

## Tone mark

**Canonical term:** `tone mark`

**Vietnamese:** dấu thanh; dấu thanh điệu

A tone mark is the visible orthographic mark representing a tone.

Examples:

```text
acute → ◌́
grave → ◌̀
hook above → ◌̉
tilde → ◌̃
dot below → ◌̣
```

A tone is semantic.

A tone mark is its written representation.

This distinction is important because VIWP.IME may need to recompute the position of a tone mark after a syllable changes without changing the syllable's semantic tone.

Avoid using `tone` and `tone mark` interchangeably in technical documentation.

---

## Tone placement

**Canonical term:** `tone placement`

**Vietnamese:** vị trí đặt dấu thanh

Tone placement is the process or policy that determines which written vowel letter carries the tone mark.

Examples include differences such as:

```text
hòa / hoà
xóa / xoá
hủy / huỷ
```

Tone placement should be modeled independently from the tone itself.

Conceptually:

```text
tone = GRAVE
+
orthographic structure
+
tone-placement policy
        ↓
rendered tone-mark position
```

VIWP.IME currently treats the traditional placement convention as the default policy.

Alternative placement behavior may be represented through a separate policy.

---

## Traditional tone placement

**Canonical term:** `traditional tone placement`

**Examples:**

```text
hòa
xóa
hủy
```

This is the initial default policy for VIWP.IME.

If source-code identifiers are required, prefer an explicit name such as:

```text
TonePlacement.TRADITIONAL
```

rather than names such as `OLD`.

---

## Reformed tone placement

**Canonical term:** `reformed tone placement`

**Examples:**

```text
hoà
xoá
huỷ
```

This policy may be supported by the shared engine.

Whether it is exposed as separate jQuery.IME input methods is an integration decision.

Prefer:

```text
TonePlacement.REFORMED
```

rather than `NEW`.

Names such as `oldStyle` and `newStyle` should be avoided because they are ambiguous and age poorly.

---

# Vietnamese vowel-letter terminology

## Vowel letter

**Canonical term:** `vowel letter`

**Vietnamese:** chữ cái nguyên âm

A vowel letter is a written Vietnamese letter representing a vowel.

The Vietnamese alphabet contains the following basic vowel letters and modified vowel letters:

```text
a ă â
e ê
i
o ô ơ
u ư
y
```

Tone marks may additionally be applied to these letters.

A vowel letter should not automatically be equated with a complete nucleus.

A nucleus may contain multiple vowel letters.

---

## Vowel diacritic

**Canonical term:** `vowel diacritic`

**Vietnamese:** dấu phụ nguyên âm

VIWP.IME uses `vowel diacritic` as the umbrella term for the diacritics that create the distinct Vietnamese vowel letters:

```text
circumflex
breve
horn
```

These must be distinguished from tone marks.

Examples:

```text
a + circumflex → â
a + breve      → ă
o + horn       → ơ
u + horn       → ư
```

Avoid the generic term `mark` when specifically referring to this category.

---

## Circumflex

**Canonical term:** `circumflex`

**Vietnamese:** dấu mũ

Used in:

```text
â
ê
ô
```

Suggested semantic identifier:

```text
VowelDiacritic.CIRCUMFLEX
```

In VNI, this operation is normally associated with input command `6`.

The VNI key itself is not part of the semantic definition.

---

## Breve

**Canonical term:** `breve`

**Vietnamese:** dấu breve; traditionally also called dấu trăng

Used in:

```text
ă
```

Suggested semantic identifier:

```text
VowelDiacritic.BREVE
```

In VNI, this operation is normally associated with input command `8`.

`Breve` is preferred in English technical documentation because it is the established Unicode and typographic term.

---

## Horn

**Canonical term:** `horn`

**Vietnamese:** dấu râu; dấu móc in some descriptions

Used in:

```text
ơ
ư
```

Suggested semantic identifier:

```text
VowelDiacritic.HORN
```

In VNI, this operation is normally associated with input command `7`.

Use `horn` in source code rather than `hook`, because `hook` is already used in this project for the hỏi tone (`HOOK`) and would create unnecessary ambiguity.

---

# The letter Đ

## D with stroke

**Canonical descriptive term:** `D with stroke`

**Canonical operation term:** `d-stroke`

**Vietnamese:** chữ đ; nét ngang của chữ đ

Vietnamese `đ` and `Đ` are distinct alphabetic letters.

The transformation:

```text
d → đ
D → Đ
```

is treated separately from vowel diacritics and tone marks.

Suggested semantic command:

```text
APPLY_D_STROKE
```

or an equivalent operation name.

Avoid modeling `đ` as an ordinary combining-diacritic transformation unless the chosen Unicode representation explicitly requires such behavior.

For developer documentation, `d-stroke` is acceptable when discussing the input operation, while `D with stroke` is preferable when discussing the character itself.

---

# Composition terminology

## Composition

**Canonical term:** `composition`

**Vietnamese:** quá trình nhập; quá trình cấu tạo chữ

Composition is the process by which a sequence of user input commands is interpreted and transformed into Vietnamese text.

Example using VNI:

```text
t
tu
tuo
tuon
tuong
tuong7
tương
```

Composition is broader than simple transliteration because earlier rendered characters may need to change when later commands alter the syllable structure.

---

## Composition state

**Canonical term:** `composition state`

**Vietnamese:** trạng thái nhập; trạng thái cấu tạo

A composition state is the structured state that the engine derives from the text currently being composed.

A composition state may represent:

* a complete orthographic syllable;
* an incomplete but composable state;
* input that cannot currently be interpreted as Vietnamese composition.

The exact data structure is an architectural decision.

---

## Complete state

**Canonical term:** `complete state`

**Vietnamese:** trạng thái hoàn chỉnh

A complete state corresponds to a structurally complete Vietnamese orthographic syllable under the model used by VIWP.IME.

Example:

```text
tường
```

Completeness is structural and orthographic.

It does not imply that the resulting string is a recognized dictionary word.

---

## Intermediate state

**Canonical term:** `intermediate state`

**Vietnamese:** trạng thái trung gian

An intermediate state is not yet a complete Vietnamese orthographic syllable or rime but is a legitimate composition state because additional input can transform it into one.

This distinction is essential for flexible Vietnamese typing.

For example, an unmodified vowel sequence may be the precursor of a vowel sequence containing a circumflex, breve, or horn.

An intermediate state must not automatically be rejected merely because it would be invalid as final Vietnamese spelling.

---

## Composable state

**Canonical term:** `composable state`

**Vietnamese:** trạng thái có thể tiếp tục cấu tạo

A composable state is any state from which the Vietnamese engine may reasonably continue composition.

Conceptually:

```text
composable state
├── complete state
└── intermediate state
```

A state may also be non-composable, in which case the input method may leave subsequent input unchanged or use other fallback behavior.

The exact fallback behavior is specified in `requirements.md`.

---

## Candidate

**Canonical term:** `candidate`

**Vietnamese:** chuỗi ứng viên

A candidate is the portion of text near the caret that the engine considers for Vietnamese composition.

For example, if the text before the caret is:

```text
hello tường
```

the engine may extract only:

```text
tường
```

as the current candidate.

`Candidate` should be used for the raw text being considered.

`Composition state` should be used for the parsed semantic representation.

---

# Input-method terminology

## Input method

**Canonical term:** `input method`

**Vietnamese:** kiểu gõ; bộ gõ, depending on user-facing context

An input method defines how physical input keys are interpreted as Vietnamese composition commands.

VIWP.IME initially supports:

```text
VNI
Telex
VIQR
```

In developer documentation, prefer `input method`.

In Vietnamese user documentation, `kiểu gõ` may be more natural when distinguishing VNI, Telex, and VIQR.

---

## Input-method adapter

**Canonical term:** `input-method adapter`

An input-method adapter converts method-specific input into shared semantic commands.

For example:

```text
VNI   1
Telex s
VIQR  '
       │
       ▼
APPLY_TONE(ACUTE)
```

Adapters should contain as little Vietnamese orthographic logic as possible.

The shared engine, rather than each adapter, should determine how the semantic command affects the current syllable.

---

## Input command

**Canonical term:** `input command`

**Vietnamese:** lệnh nhập

An input command is the interpretation of a user input key or sequence within a particular input method.

Examples in VNI:

```text
1 → acute tone
6 → circumflex
7 → horn
8 → breve
9 → d-stroke
0 → tone removal
```

An input command is input-method-specific.

The semantic operation produced from it should be input-method-independent.

---

## Semantic command

**Canonical term:** `semantic command`

A semantic command is an input-method-independent request to modify the current Vietnamese composition state.

Conceptual examples:

```text
APPLY_TONE(ACUTE)
APPLY_VOWEL_DIACRITIC(CIRCUMFLEX)
APPLY_VOWEL_DIACRITIC(HORN)
APPLY_VOWEL_DIACRITIC(BREVE)
APPLY_D_STROKE
REMOVE_TONE
```

The exact API and enum names remain implementation decisions.

The distinction is:

```text
input key
   ↓
input command
   ↓
semantic command
   ↓
Vietnamese transformation
```

---

## Transformation

**Canonical term:** `transformation`

A transformation is the application of a semantic command to a composition state.

Conceptually:

```text
current state
+
semantic command
        ↓
new state
```

Rendering the new state into Unicode text may be treated as a separate step.

---

## Escape behavior

**Canonical term:** `escape behavior`

**Vietnamese:** hành vi thoát; hoàn nguyên phím nhập

Escape behavior allows a key that would normally be interpreted as an input command to be entered literally.

A common form is repeated-key escape.

Example using VNI:

```text
a1  → á
a11 → a1
```

The second `1` causes the previous tone transformation to be undone and preserves a literal `1`.

This is useful for mixed-language and technical text such as:

```text
a11y
```

Specific escape semantics are defined in `requirements.md`.

---

## Repeated-key escape

**Canonical term:** `repeated-key escape`

Repeated-key escape is an escape mechanism in which repeating the same command key reverses or cancels the previous transformation and preserves a literal form of the input.

Example:

```text
a1  → á
a11 → a1
```

This term should be preferred over vague descriptions such as `double key behavior`.

---

## Tone removal

**Canonical term:** `tone removal`

**Vietnamese:** xóa dấu thanh

Tone removal removes the current semantic tone while preserving other Vietnamese vowel properties.

Conceptually:

```text
tường
    ↓ REMOVE_TONE
tương
```

It must be distinguished from:

* removing vowel diacritics;
* converting `đ` to `d`;
* resetting all Vietnamese composition.

For VNI, tone removal is conventionally associated with `0`.

---

# Unicode terminology

## Code point

**Canonical term:** `code point`

A Unicode code point is an abstract Unicode character value such as:

```text
U+0061
U+0301
```

Do not equate JavaScript string length with the number of user-perceived characters.

---

## Precomposed character

**Canonical term:** `precomposed character`

A precomposed character represents a combination such as a Vietnamese vowel and its diacritics as a single Unicode code point where such a character exists.

Example:

```text
ấ
```

may be represented as a precomposed Unicode character.

---

## Combining mark

**Canonical term:** `combining mark`

A combining mark is a Unicode code point that combines with a preceding base character.

Relevant Vietnamese examples include combining representations of:

* circumflex;
* breve;
* horn;
* acute;
* grave;
* hook above;
* tilde;
* dot below.

Combining marks are Unicode representation details and should not replace semantic concepts such as `tone` or `vowel diacritic` in the engine model.

---

## Unicode normalization

**Canonical term:** `Unicode normalization`

Unicode normalization converts canonically equivalent Unicode sequences into defined normalization forms.

The two forms most relevant to VIWP.IME are:

```text
NFC
NFD
```

### NFC

**Canonical term:** `NFC`

Normalization Form C favors canonical composition.

It is a likely representation for final rendered Vietnamese text.

### NFD

**Canonical term:** `NFD`

Normalization Form D performs canonical decomposition.

It may be useful internally when examining the components of Vietnamese characters.

Whether VIWP.IME uses NFD as part of its implementation is an architectural decision, not a terminology requirement.

---

# Orthographic validity terminology

## Structurally valid

**Canonical term:** `structurally valid`

A string is structurally valid when it conforms to the orthographic structure recognized by VIWP.IME.

Structural validity does not imply lexical validity.

For example, the engine may recognize a syllable structure that is theoretically possible even if the result is rare or absent from ordinary dictionaries.

---

## Lexically valid

**Canonical term:** `lexically valid`

A string is lexically valid when it corresponds to an accepted lexical item under some dictionary or lexical resource.

VIWP.IME does not initially attempt to establish lexical validity.

The engine is not intended to become a Vietnamese dictionary or general-purpose spell checker.

---

## Orthographic validation

**Canonical term:** `orthographic validation`

Orthographic validation checks whether a candidate conforms to the structural spelling rules modeled by VIWP.IME.

It may eventually be used conservatively to reduce unintended transformations in clearly non-Vietnamese text.

Strict validation is not an initial implementation requirement.

---

## Checked syllable

**Canonical term:** `checked syllable`

A checked syllable is a syllable ending in an unreleased stop represented orthographically by endings such as:

```text
-c
-ch
-p
-t
```

In standard Vietnamese orthography, these syllables are restricted to the sắc and nặng tones.

This constraint may be represented explicitly by the orthographic model.

The term should not be confused with the general idea of a syllable having been "checked" or validated by the software.

---

# Terms to avoid

The following terms should generally not be used as canonical source-code terminology.

## `mark`

Avoid using `mark` alone.

It is ambiguous between:

* tone mark;
* circumflex;
* breve;
* horn;
* arbitrary Unicode combining marks.

Use the specific concept instead.

---

## `accent`

Avoid using `accent` as the canonical term for Vietnamese tone.

Depending on context, `accent` may refer to pronunciation, stress, regional speech, or a written diacritic.

Prefer:

```text
tone
tone mark
vowel diacritic
```

as appropriate.

---

## `main vowel`

Avoid as a canonical code term.

Prefer:

```text
nucleus
```

Vietnamese explanatory documentation may describe the nucleus as `âm chính`.

---

## `final`

Avoid using `final` alone for a coda.

It may be confused with a final composition state.

Prefer:

```text
coda
```

---

## `old style` / `new style`

Avoid these terms for tone-placement policies.

Prefer:

```text
traditional tone placement
reformed tone placement
```

and explicit identifiers such as:

```text
TonePlacement.TRADITIONAL
TonePlacement.REFORMED
```

---

## `valid word`

Avoid unless lexical validity has actually been established.

Prefer one of:

```text
structurally valid syllable
valid composition state
lexically valid word
```

depending on what is intended.

---

# Recommended identifier vocabulary

The following names illustrate the preferred vocabulary for implementation.

They are not yet a frozen API.

```text
Syllable
Onset
Rime
Nucleus
Coda

Tone
TonePlacement
ToneMark

VowelDiacritic

CompositionState
IntermediateState

InputCommand
SemanticCommand

parseCandidate()
applyTone()
removeTone()
applyVowelDiacritic()
applyDStroke()
renderSyllable()
validateOrthography()
```

Possible enums:

```text
Tone.NONE
Tone.ACUTE
Tone.GRAVE
Tone.HOOK
Tone.TILDE
Tone.DOT
```

```text
VowelDiacritic.NONE
VowelDiacritic.CIRCUMFLEX
VowelDiacritic.BREVE
VowelDiacritic.HORN
```

```text
TonePlacement.TRADITIONAL
TonePlacement.REFORMED
```

These names may be refined during the architecture and implementation phases, but changes should preserve the distinctions established by this document.

---

# Terminology summary

The most important distinctions in VIWP.IME are:

```text
tone
≠
tone mark
```

```text
vowel diacritic
≠
tone mark
```

```text
input command
≠
semantic command
```

```text
complete orthographic syllable
≠
intermediate composition state
```

```text
structurally valid
≠
lexically valid
```

```text
Vietnamese orthographic model
≠
complete Vietnamese phonological analysis
```

Maintaining these distinctions consistently should make both the implementation and its documentation easier to reason about.
