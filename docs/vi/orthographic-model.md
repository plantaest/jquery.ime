# Vietnamese Orthographic Model

This document defines the working Vietnamese orthographic model used by VIWP.IME.

The model exists to support Vietnamese text composition. It is not intended to be a complete linguistic theory of Vietnamese phonology, a dictionary, or a prescriptive grammar of all forms of written Vietnamese.

The primary question addressed by this document is:

> Given a short sequence of text near the caret, what structure must the engine understand in order to apply Vietnamese input commands correctly and render the expected Vietnamese spelling?

The terminology used here follows [`terminology.md`](./terminology.md).

---

# 1. Design goals

The orthographic model should be:

* expressive enough to support VNI, Telex, and VIQR;
* independent from any particular input method;
* deterministic;
* suitable for parsing and rendering;
* capable of representing tone independently from its visible position;
* capable of representing both complete Vietnamese syllables and intermediate typing states;
* strict enough to describe Vietnamese structure;
* but not so strict that ordinary composition becomes dependent on a dictionary.

The model should also make important Vietnamese spelling behavior explicit rather than encoding it indirectly through rule ordering.

Examples include:

* `qu`;
* `gi`;
* `c/k`;
* `g/gh`;
* `ng/ngh`;
* checked syllables;
* contextual spellings of complex nuclei;
* traditional and reformed tone placement.

---

# 2. Non-goals

This document does not attempt to model:

* pronunciation differences among Vietnamese dialects;
* IPA output;
* lexical validity;
* word segmentation;
* morphology;
* minority-language orthographies used in Vietnam;
* arbitrary foreign words;
* every historical spelling convention;
* every possible non-standard Vietnamese Internet spelling.

The engine operates on Vietnamese Quốc Ngữ orthography.

Phonological concepts may be used where they provide a useful structural model, but the implementation should not depend on one particular phonological analysis when the written behavior can be described directly.

---

# 3. Fundamental unit

The primary linguistic unit handled by the engine is the **orthographic syllable**.

At the highest level, VIWP.IME models it as:

```text
OrthographicSyllable
├── onset
├── rime
└── tone
```

The onset may be absent.

The rime is required.

Every Vietnamese syllable has a semantic tone, including the unmarked `NONE` tone corresponding to thanh ngang.

A broadly similar onset–rime–tone decomposition is commonly used in computational descriptions of Vietnamese. More detailed analyses usually divide the rime into a medial, nucleus, and ending/coda.

---

# 4. Working structural model

For VIWP.IME, the working model is:

```text
OrthographicSyllable
│
├── onset?
│
├── rime
│   ├── medial?
│   ├── nucleus
│   └── ending?
│
└── tone
```

The `ending` abstraction is intentionally broader than `coda`.

It may represent either:

```text
consonantal coda
```

or:

```text
off-glide
```

This distinction prevents the implementation from forcing final written vowel letters such as `i` or `u` into the same category as consonantal endings such as `n` or `ng`.

A possible conceptual representation is:

```text
Rime {
    medial: Medial | NONE,
    nucleus: Nucleus,
    ending: Ending | NONE
}
```

where:

```text
Ending
├── ConsonantalCoda
└── OffGlide
```

This is a domain model, not a frozen JavaScript API.

Implementation data structures may differ as long as they preserve the relevant distinctions.

---

# 5. Orthographic surface and semantic state

The engine must distinguish the **surface spelling** from the **semantic structure** it represents.

For example:

```text
tường
```

contains a visible grave tone mark.

Internally, the engine should be able to reason about something conceptually equivalent to:

```text
onset:   t
rime:    ường
tone:    GRAVE
```

and more structurally:

```text
onset:   t
medial:  NONE
nucleus: ươ
ending:  ng
tone:    GRAVE
```

The fact that the grave mark is visibly rendered on `ơ` is not itself the semantic definition of the tone.

This distinction allows later changes in syllable structure to trigger a new tone-placement calculation without changing the tone value.

---

# 6. Vietnamese vowel letters

Modern Vietnamese orthography uses twelve vowel letters:

```text
a ă â e ê i o ô ơ u ư y
```

and five written tone marks in addition to the unmarked tone. Unicode explicitly describes modern Vietnamese in these terms.

The three vowel-diacritic categories relevant to VIWP.IME are:

```text
CIRCUMFLEX
BREVE
HORN
```

They produce:

```text
a + CIRCUMFLEX → â
e + CIRCUMFLEX → ê
o + CIRCUMFLEX → ô

a + BREVE      → ă

o + HORN       → ơ
u + HORN       → ư
```

These properties belong to vowel identity and must remain distinct from tone.

For example:

```text
ấ
```

conceptually contains:

```text
base vowel:        a
vowel diacritic:   CIRCUMFLEX
tone:              ACUTE
```

---

# 7. Tone

VIWP.IME uses six semantic tone values:

```text
NONE
ACUTE
GRAVE
HOOK
TILDE
DOT
```

corresponding to:

```text
ngang
sắc
huyền
hỏi
ngã
nặng
```

Tone belongs to the syllable as a semantic property.

The engine should therefore prefer a model equivalent to:

```text
Syllable {
    ...
    tone: Tone
}
```

rather than a model in which tone exists only as a property of one particular Unicode character.

The rendering stage decides which vowel letter visually carries the tone mark.

---

# 8. Tone-bearing position

The **tone-bearing position** is derived from:

```text
parsed orthographic structure
+
tone-placement policy
```

It is not a permanent property of the tone.

Conceptually:

```text
findToneTarget(syllable, policy)
```

produces a position in the rendered vowel sequence.

This separation is fundamental to flexible Vietnamese input.

For example, if composition changes the relevant vowel structure, the same semantic tone may have to be rendered on another letter.

---

# 9. Rime

The rime is the part of the orthographic syllable following the onset.

Conceptually:

```text
rime
├── medial?
├── nucleus
└── ending?
```

Examples:

```text
ban
→ onset: b
→ rime:  an

tường
→ onset: t
→ rime:  ường

nghiêng
→ onset: ngh
→ rime:  iêng
```

The project's model is primarily orthographic.

It therefore does not require a perfect one-to-one mapping between the written rime and a particular phonological analysis.

---

# 10. Medial

Vietnamese descriptions traditionally recognize an optional medial, commonly associated with a /w/-like glide and represented orthographically by `o` or `u` in appropriate environments.

The exact phonological status of this element is debated in linguistic analyses, which is another reason VIWP.IME treats it primarily as an orthographic modeling tool rather than a claim about universal Vietnamese phonology.

Examples where the distinction is useful include:

```text
hoa
hoe
hoăn
tuần
thuê
tuy
chuyện
```

Conceptually, examples may be analyzed as:

```text
hoa
medial:  o
nucleus: a

hoe
medial:  o
nucleus: e

tuần
medial:  u
nucleus: â
ending:  n

chuyện
medial:  u
nucleus: yê
ending:  n
```

This decomposition is especially useful for tone placement.

It explains structurally why tone-placement conventions may disagree in an open form such as:

```text
hòa / hoà
```

without requiring the engine to treat `oa` as an indivisible special case everywhere.

---

# 11. Nucleus

The nucleus is the central vowel-bearing component of the rime.

VIWP.IME distinguishes between **simple nuclei** and **complex nucleus families**.

## 11.1 Simple nuclei

The basic written nucleus inventory includes vowel letters such as:

```text
a
ă
â
e
ê
i
o
ô
ơ
u
ư
y
```

Not every theoretical combination of onset, medial, nucleus, ending, and tone is necessarily valid Vietnamese spelling.

The model represents structure separately from later validation.

---

# 12. Complex nucleus families

Several Vietnamese vowel nuclei have contextual spelling variants.

For input-method purposes, these variants should preferably be understood as members of the same structural family rather than unrelated arbitrary strings.

## 12.1 IÊ family

Relevant surface spellings include:

```text
ia
iê
ya
yê
```

Examples:

```text
mía
tiếng
khuya
yên
chuyện
yếu
```

A useful high-level distinction is:

```text
ia / ya
```

for appropriate forms without a following ending, versus:

```text
iê / yê
```

in forms where the orthographic environment requires the `ê` spelling.

The precise contextual distribution should be represented by grammar data rather than duplicated in transformation code.

---

## 12.2 UÔ family

Relevant spellings include:

```text
ua
uô
```

Examples:

```text
múa
muốn
chuối
```

Conceptually:

```text
múa
→ nucleus family: UÔ
→ open spelling: ua

muốn
→ nucleus family: UÔ
→ spelling with ending: uô
```

This distinction matters for tone placement because:

```text
múa
```

carries the tone on `u`, while:

```text
muốn
```

carries it on `ô`.

---

## 12.3 ƯƠ family

Relevant spellings include:

```text
ưa
ươ
```

Examples:

```text
mưa
cửa
mượn
rượu
```

Conceptually:

```text
mưa
→ open spelling: ưa

mượn
→ spelling with ending: ươ
```

The corresponding tone target changes with the written form:

```text
ưa → tone target: ư
ươ → tone target: ơ
```

---

# 13. Ending

The optional `ending` component is divided into two broad classes.

## 13.1 Consonantal coda

The core orthographic consonantal coda spellings are:

```text
m
n
ng
nh
p
t
c
ch
```

Examples:

```text
cam
ban
đang
anh
đẹp
mát
học
sách
```

These are surface spellings.

The engine does not need to resolve dialect-specific phonetic realizations of these codas.

---

## 13.2 Off-glide

Some rimes end in written vowel letters functioning structurally as a glide rather than as the nucleus.

Relevant surface endings include forms written with:

```text
i
y
u
o
```

Examples include:

```text
bài
tay
đau
heo
```

A useful conceptual parse is:

```text
bài
nucleus: a
ending:  i

tay
nucleus: a
ending:  y

đau
nucleus: a
ending:  u

heo
nucleus: e
ending:  o
```

The exact permitted nucleus–off-glide combinations should be encoded as orthographic grammar data rather than inferred from arbitrary vowel sequences.

---

# 14. Onset

The onset is optional.

A practical core inventory of onset spellings includes:

```text
b
c
ch
d
đ
g
gh
gi
h
k
kh
l
m
n
ng
ngh
nh
p
ph
qu
r
s
t
th
tr
v
x
```

Initial `p` occurs mainly in borrowed vocabulary but is part of modern written Vietnamese and should not require a fundamentally different parser.

This inventory is intended as a practical orthographic inventory rather than a phonemic inventory.

A similar spelling inventory appears in orthography-oriented Vietnamese syllable analyses; the Hiếu Thi syllable table separates ordinary onsets, multiletter onsets, and the context-sensitive `ng/ngh`, `g/gh`, and `c/k` groups.

---

# 15. Empty onset

An onset may be absent.

Examples include:

```text
a
ăn
êm
ơi
yêu
```

The absence of an onset is a normal structural state and must not be represented as an error.

Conceptually:

```text
onset: NONE
```

is preferable to inventing a silent consonant for orthographic processing.

---

# 16. Contextual onset spellings

Some Vietnamese onset sounds have orthographically conditioned spellings.

These matter primarily for parsing and optional validation.

## 16.1 `c` / `k`

The spellings `c` and `k` represent contextually related onset spellings.

In ordinary orthography:

```text
k
```

is used before front-vowel spellings such as:

```text
i
e
ê
```

and also occurs before `y`, while `c` occurs elsewhere.

Examples:

```text
ki
kê
kẹo
kỹ

ca
cô
cư
```

VIWP.IME does not initially need to transform `c` into `k` or vice versa.

The rule is useful primarily for structural validation.

---

## 16.2 `g` / `gh`

`gh` is used before:

```text
i
e
ê
```

while `g` is used elsewhere.

Examples:

```text
ghi
ghe
ghê

ga
gô
gư
```

This is again primarily a parsing and validation concern rather than an input-command transformation.

---

## 16.3 `ng` / `ngh`

`ngh` is used before:

```text
i
e
ê
```

while `ng` is used elsewhere.

Examples:

```text
nghi
nghe
nghê

nga
ngo
ngư
```

---

# 17. Special orthographic onset: `qu`

`qu` must receive explicit treatment.

For VIWP.IME, it is useful to treat the written `u` in `qu` as belonging to the special onset structure rather than naively treating it as an ordinary nucleus vowel.

Conceptually:

```text
quá
onset:   qu
nucleus: a
tone:    ACUTE
```

```text
quý
onset:   qu
nucleus: y
tone:    ACUTE
```

```text
quốc
onset:   qu
nucleus: ô
ending:  c
tone:    ACUTE
```

This immediately prevents incorrect tone placement on the `u`.

It also explains why:

```text
quá
```

does not participate in the `hòa / hoà` type of tone-placement ambiguity.

Orthographic descriptions often treat `qu` as a special onset spelling in precisely this kind of computational simplification.

The exact internal representation of `qu` may be refined during implementation.

The required invariant is:

> The `u` in an ordinary `qu` onset must not be treated as an independent tone-bearing vowel.

---

# 18. Special orthographic onset: `gi`

`gi` also requires explicit treatment.

A naïve longest-prefix parse is insufficient because the written `i` participates unusually in some syllables.

Compare:

```text
gia
giữ
gì
giếng
```

A practical conceptual interpretation is:

```text
gia
→ onset: gi
→ nucleus: a
```

```text
giữ
→ onset: gi
→ nucleus: ư
```

but forms such as:

```text
gì
giếng
```

require special surface handling because the written `i` associated with `gi` interacts with a rime beginning in the `i` family.

Orthographic syllable-generation work has described this as a spelling contraction or overlap: combining `gi` with an `i`-initial rime must not produce two consecutive `i` letters.

VIWP.IME therefore establishes the following requirement:

> `gi` must be handled by an explicit orthographic rule rather than by treating `g`, `i`, and the following vowel letters independently.

The exact in-memory representation remains an architecture decision.

A parser may, for example, represent a special `GI` onset state or use another deterministic mechanism.

---

# 19. Checked syllables

A syllable with a consonantal ending:

```text
p
t
c
ch
```

is a **checked syllable**.

In standard Vietnamese, these syllables occur only with:

```text
ACUTE
DOT
```

that is:

```text
sắc
nặng
```

Examples:

```text
mát
mạt

học
hóc

sách
sạch
```

Descriptions of Vietnamese tone systems consistently distinguish these stop-final syllables as having only the sắc/nặng opposition.

The model should therefore support an allowed-tone constraint:

```text
if ending ∈ { p, t, c, ch }:
    allowedTones = { ACUTE, DOT }
```

This does not yet determine what the input method should do if the user explicitly requests another tone.

That is a behavioral-validation question left open in `requirements.md`.

---

# 20. Other endings

Syllables with:

```text
NONE
m
n
ng
nh
off-glide
```

are not subject to the checked-syllable two-tone restriction and structurally support the ordinary six-tone inventory.

Lexical existence remains a separate issue.

---

# 21. Tone placement as rendering

Tone placement should be treated as part of rendering.

Conceptually:

```text
semantic syllable
       │
       ├── tone
       ├── rime structure
       └── tone-placement policy
                │
                ▼
          rendered spelling
```

This means there should not be a fundamental semantic operation called:

```text
MOVE_TONE
```

A tone does not conceptually move.

Instead:

1. the syllable structure changes;
2. the existing semantic tone is preserved;
3. the renderer recalculates its visual target.

---

# 22. Natural tone target of the nucleus

Before applying policy-specific exceptions, the nucleus itself has a natural orthographic tone target.

## 22.1 Simple nucleus

For a one-letter nucleus:

```text
a
ă
â
e
ê
i
o
ô
ơ
u
ư
y
```

the target is that letter.

Examples:

```text
a  → á
ơ  → ờ
ư  → ử
```

---

## 22.2 IÊ-family nucleus

For:

```text
ia
ya
```

the target is the first letter:

```text
mía
```

For:

```text
iê
yê
```

the target is the diacritic-bearing second letter:

```text
tiếng
yến
yếu
```

---

## 22.3 UÔ-family nucleus

For:

```text
ua
```

the target is:

```text
u
```

as in:

```text
múa
```

For:

```text
uô
```

the target is:

```text
ô
```

as in:

```text
muốn
chuối
```

---

## 22.4 ƯƠ-family nucleus

For:

```text
ưa
```

the target is:

```text
ư
```

as in:

```text
cửa
```

For:

```text
ươ
```

the target is:

```text
ơ
```

as in:

```text
tường
rượu
```

---

# 23. Medial plus nucleus

Where a distinct medial is present, the **reformed tone-placement policy** places the tone on the nucleus rather than the medial.

Examples:

```text
hoa
medial:  o
nucleus: a

reformed + GRAVE
→ hoà
```

```text
hoe
medial:  o
nucleus: e

reformed + HOOK
→ hoẻ
```

```text
huy
medial:  u
nucleus: y

reformed + HOOK
→ huỷ
```

This is the structural rationale behind the reformed spellings commonly contrasted with `hòa`, `hỏe`/`khỏe`, and `hủy`-style traditional placement. The jQuery.IME settings issue itself uses `xóa` versus `xoá` as the representative distinction.

---

# 24. Traditional tone placement

The default VIWP.IME policy is:

```text
TonePlacement.TRADITIONAL
```

For most syllable structures, traditional and reformed placement produce the same output.

The important difference is a small class of open rimes involving an orthographic medial and a simple unmodified nucleus.

For the traditional policy, open structures corresponding to:

```text
oa
oe
uy
```

place the tone on the first written vowel letter.

Examples:

```text
hòa
xóa

khỏe
lóe

hủy
thủy
```

The alternative reformed policy places the mark on the nucleus:

```text
hoà
xoá

khoẻ
loé

huỷ
thuỷ
```

Descriptions comparing the two Vietnamese tone-placement conventions identify these `oa`, `oe`, and `uy` environments as the main visible difference.

---

# 25. Effect of an ending on tone placement

Once an ending follows these structures, the ordinary nucleus target applies.

For example:

```text
hoan
```

is structurally:

```text
medial:  o
nucleus: a
ending:  n
```

so tone is rendered on `a`:

```text
hoàn
hoán
hoản
```

Likewise:

```text
xoen...
huynh...
```

do not use the open-rime traditional-placement exception.

This structural approach is preferable to implementing isolated string rules such as:

```text
"oa means tone on o"
```

because that rule would immediately fail for:

```text
hoàn
ngoạn
toán
```

---

# 26. Vowel diacritics take structural precedence

Where a nucleus contains a vowel letter such as:

```text
ă
â
ê
ô
ơ
ư
```

tone placement normally follows the structurally identified nucleus.

Examples:

```text
tuần
thuế
cuốn
tưởng
chuyện
```

The engine should not infer tone position merely from the number of written vowel characters.

It must first identify the orthographic structure.

---

# 27. Composition is not final orthography

A Vietnamese input method must recognize states that would be invalid or unusual as final Vietnamese text.

For example, while typing VNI, a user may temporarily produce or conceptually pass through ASCII-like forms such as:

```text
tuong
```

before applying:

```text
7
```

to obtain:

```text
tương
```

A parser designed only as:

```text
is this already a valid Vietnamese syllable?
```

would reject useful input too early.

VIWP.IME therefore distinguishes **final orthographic grammar** from **composition grammar**.

---

# 28. Complete state

A complete state corresponds to a structurally complete Vietnamese orthographic syllable.

Examples:

```text
a
ban
tương
tường
quốc
nghiêng
```

A complete state may still be extended by later typing.

For example:

```text
ban
```

may already be complete, but the user can continue typing additional text.

Therefore:

> `complete` does not mean that composition must stop.

---

# 29. Intermediate state

An intermediate state is a form that the engine recognizes as a legitimate precursor to Vietnamese composition even though it may not be acceptable final Vietnamese orthography.

Examples may include ASCII precursors such as:

```text
tuong
```

or partially transformed forms arising when a tone command is entered before a later vowel-diacritic command.

The important property is not:

```text
valid final Vietnamese
```

but:

```text
can still become a supported Vietnamese structure through normal input commands
```

---

# 30. Precursor relationships

Some orthographic structures have useful precursor relationships.

Conceptually:

```text
ie  → iê
ua  → uâ, or other context-dependent structures
ue  → uê
uo  → uô / ươ
uye → uyê
```

The exact mapping depends on the input command and parsed context.

These relationships should not be implemented as blind text replacements.

They represent:

```text
current composition state
+
semantic command
→
new orthographic state
```

For example:

```text
tuong
+
APPLY_VOWEL_DIACRITIC(HORN)
→
tương
```

The parser must therefore be able to recognize the precursor sequence without claiming that `tuong` is itself standard Vietnamese spelling.

---

# 31. Ambiguous states

Some surface strings may support more than one possible interpretation.

The parser should prefer interpretations that:

1. produce a structurally supported Vietnamese composition;
2. respect explicit onset structures such as `qu` and `gi`;
3. respect longer recognized orthographic structures over accidental submatches;
4. remain deterministic.

Parser ambiguity must be resolved through explicit grammar rules.

It must not depend accidentally on:

```text
which regular expression happened to run first
```

or:

```text
which substring happened to be matched first
```

---

# 32. Structural validity versus lexical validity

The model recognizes **structural validity**.

It does not initially recognize **lexical validity**.

For example:

```text
a structurally plausible syllable
```

need not appear in a Vietnamese dictionary.

This distinction is important because an input method should not require a lexicon merely to type names, rare terms, newly coined words, or unusual but orthographically legitimate forms.

The orthographic-rime study by Hiếu Thi deliberately generated 17,974 candidate syllables and notes that more than half are not actually used; this makes it useful as a coverage resource but unsuitable as a direct lexical whitelist.

---

# 33. Orthographic inventories as data

The project should prefer explicit data inventories for relationships such as:

```text
allowed onset spellings

allowed nucleus spellings

allowed medial–nucleus combinations

allowed endings for a nucleus

allowed tone classes

contextual nucleus spellings
```

over embedding all of this knowledge inside procedural transformation code.

Conceptually:

```text
grammar data
        │
        ├── parser
        ├── validator
        ├── renderer
        └── test generator
```

should share the same underlying information where practical.

This reduces the risk that four separate implementations of Vietnamese orthography gradually disagree.

---

# 34. Use of the Hiếu Thi rime table

The 2017 orthographic rime-construction table by Luong Hieu Thi is a valuable starting resource for VIWP.IME because it explicitly organizes written rimes by:

* central vowel or vowel sequence;
* possible ending;
* tone restrictions;
* onset behavior.

Its main table visually exposes relationships such as:

```text
nucleus / vowel sequence
×
ending
→
possible orthographic rime
```

and is therefore particularly useful for:

* coverage analysis;
* generating candidate grammar data;
* generating test cases;
* identifying holes in the engine.

However, it must not be copied directly as the normative VIWP.IME grammar.

The author explicitly states that the work prefers recall over precision and intentionally permits many generated syllables that do not occur in actual Vietnamese.

VIWP.IME should therefore use the table as:

```text
research input
```

and:

```text
coverage corpus
```

rather than:

```text
authoritative whitelist
```

---

# 35. Tone restrictions in the Hiếu Thi table

The rime matrix also visually distinguishes unrestricted and checked rimes.

VIWP.IME should independently encode the established checked-syllable rule:

```text
-p
-t
-c
-ch
→
ACUTE or DOT only
```

rather than relying literally on every prose label surrounding the original table.

This distinction is important because the project grammar should be supported by multiple sources and testable orthographic behavior rather than imported wholesale from one exploratory dataset.

---

# 36. Unicode representation

Vietnamese text can have canonically equivalent Unicode representations.

For example, a visible character such as:

```text
ẩ
```

may be represented in NFC as a precomposed character, while NFD decomposes it conceptually into:

```text
A
+
COMBINING CIRCUMFLEX
+
COMBINING HOOK ABOVE
```

Unicode explicitly documents this NFC/NFD relationship for Vietnamese.

Therefore the parser must not base linguistic logic solely on a table of precomposed Vietnamese characters.

---

# 37. Relevant Unicode combining marks

Relevant combining characters include:

```text
U+0300 COMBINING GRAVE ACCENT
U+0301 COMBINING ACUTE ACCENT
U+0302 COMBINING CIRCUMFLEX ACCENT
U+0303 COMBINING TILDE
U+0306 COMBINING BREVE
U+0309 COMBINING HOOK ABOVE
U+031B COMBINING HORN
U+0323 COMBINING DOT BELOW
```

Unicode specifically identifies the tilde and hook above as Vietnamese tone marks and identifies U+031B as COMBINING HORN.

The engine's semantic enums do not need to use Unicode code-point names directly, but the mapping should be explicit.

---

# 38. NFC and NFD

The final VIWP.IME implementation should be able to reason about canonically equivalent Vietnamese text.

A possible architecture is:

```text
surface Unicode
      ↓
normalize / decompose for analysis
      ↓
semantic orthographic state
      ↓
transform
      ↓
render
      ↓
NFC output
```

Whether the implementation literally calls:

```js
text.normalize( 'NFD' )
```

as its primary parsing mechanism is not decided by this document.

That question belongs to `architecture.md` and should be tested experimentally.

The orthographic requirement is simply:

> Unicode representation must not become the semantic model.

---

# 39. Đ is separate

`đ` and `Đ` must be represented separately from the vowel-diacritic system.

Conceptually:

```text
d ↔ đ
D ↔ Đ
```

is an alphabetic transformation handled by the `d-stroke` operation.

The engine must not assume that every Vietnamese modified letter can be recovered through ordinary canonical decomposition into a base letter plus a combining mark.

---

# 40. Case

Orthographic structure is case-insensitive except for rendering.

For example:

```text
TƯỜNG
Tường
tường
```

have equivalent relevant syllable structure aside from capitalization.

Parsing should therefore identify orthographic categories independently from case while preserving enough surface information to render the user's intended capitalization.

Case handling must not require duplicated linguistic grammar.

---

# 41. Candidate boundary

The orthographic engine operates on a short **candidate** near the caret rather than the entire document.

Candidate extraction is primarily an architectural responsibility, but the orthographic model assumes that:

* whitespace normally terminates the current syllable candidate;
* ordinary punctuation normally terminates it;
* Vietnamese letters belong to the candidate;
* input-method command keys are interpreted by the adapter rather than treated automatically as part of the final orthographic syllable.

The exact backward search range and jQuery.IME interaction are deferred to the integration spike.

---

# 42. Parsing priorities

A future parser should follow semantic priorities rather than regex ordering.

A conceptual parsing sequence is:

```text
1. normalize the relevant surface representation

2. identify and extract tone

3. recognize special onset structures

4. identify ordinary onset

5. analyze rime

6. identify medial where applicable

7. identify nucleus or nucleus family

8. identify ending

9. classify complete/intermediate state

10. determine structural constraints
```

This sequence is illustrative rather than a frozen implementation algorithm.

The important requirement is that each structural decision is explicit and testable.

---

# 43. Rendering priorities

A renderer conceptually performs the reverse operation:

```text
semantic state
      ↓
choose contextual orthographic spelling
      ↓
determine tone target
      ↓
apply vowel diacritics
      ↓
apply tone mark
      ↓
apply capitalization
      ↓
normalize Unicode
```

The renderer should produce deterministic output for a given:

```text
composition state
+
tone-placement policy
```

---

# 44. Example: `tường`

A conceptual parse is:

```text
surface:  tường

onset:
    t

rime:
    medial:
        NONE

    nucleus:
        family: ƯƠ
        spelling: ươ

    ending:
        consonantal coda: ng

tone:
    GRAVE
```

Tone target:

```text
ơ
```

Rendering:

```text
t + ườ + ng
→ tường
```

A later input operation that changes the tone to acute should conceptually modify only:

```text
tone: GRAVE
```

to:

```text
tone: ACUTE
```

and rerender:

```text
tướng
```

---

# 45. Example: `hòa`

Under the default traditional policy:

```text
surface: hòa

onset:
    h

rime:
    medial:
        o

    nucleus:
        a

    ending:
        NONE

tone:
    GRAVE

tonePlacement:
    TRADITIONAL
```

Traditional tone target:

```text
o
```

result:

```text
hòa
```

With the same semantic syllable and:

```text
TonePlacement.REFORMED
```

the target becomes the nucleus:

```text
a
```

result:

```text
hoà
```

The semantic tone does not change.

---

# 46. Example: `hoàn`

Conceptual structure:

```text
onset:
    h

medial:
    o

nucleus:
    a

ending:
    n

tone:
    GRAVE
```

Because an ending is present, the tone target is the nucleus under both supported policies:

```text
a
```

result:

```text
hoàn
```

This demonstrates why tone placement must depend on parsed structure rather than only on the substring `oa`.

---

# 47. Example: `quốc`

Conceptual structure:

```text
surface:
    quốc

onset:
    qu

rime:
    medial:
        NONE

    nucleus:
        ô

    ending:
        c

tone:
    ACUTE
```

The `u` in `qu` is not considered the tone-bearing nucleus.

Tone target:

```text
ô
```

The checked ending:

```text
c
```

is compatible with:

```text
ACUTE
```

---

# 48. Example: `giếng`

Conceptually:

```text
surface:
    giếng

special onset:
    GI

rime:
    IÊ-family structure

ending:
    ng

tone:
    ACUTE
```

The surface `i` interacts with both the special `gi` spelling and the `iê`-family rime representation.

The parser must not interpret the word as a sequence of unrelated letters:

```text
g + i + ê + ng
```

without recognizing the `gi` orthographic behavior.

The exact index-sharing representation is intentionally deferred to architecture and implementation.

---

# 49. Example: VNI intermediate composition

Suppose the user intends:

```text
tường
```

and types a VNI sequence involving:

```text
tuong
```

followed by commands corresponding to:

```text
HORN
GRAVE
```

The engine should conceptually progress through semantic transformations such as:

```text
ASCII-like precursor
        ↓
recognized composition state
        ↓
apply HORN
        ↓
nucleus becomes ươ
        ↓
apply GRAVE
        ↓
tone = GRAVE
        ↓
render
        ↓
tường
```

If the tone command is entered earlier, the final semantic state should converge to the same result where the input convention allows it.

This convergence is a primary property to test.

---

# 50. Orthographic invariants

The following invariants should guide implementation.

## 50.1 One semantic tone

A composition state has at most one semantic Vietnamese tone:

```text
tone ∈ {
    NONE,
    ACUTE,
    GRAVE,
    HOOK,
    TILDE,
    DOT
}
```

---

## 50.2 Tone is independent of visual position

Changing the structural tone target does not change the semantic tone.

---

## 50.3 Vowel diacritic is not tone

For example:

```text
â
```

is a vowel identity.

```text
ấ
```

is:

```text
â + ACUTE
```

semantically.

---

## 50.4 Complete and composable are different properties

A complete syllable may remain composable.

An incomplete spelling may also remain composable.

---

## 50.5 Structural and lexical validity are separate

The parser must not require a dictionary to recognize normal Vietnamese composition.

---

## 50.6 Surface spelling and semantic representation are separate

Multiple Unicode sequences may represent the same semantic state.

Contextual orthographic spellings may also represent the same nucleus family.

---

## 50.7 Input method is not orthography

The orthographic engine does not know that VNI uses:

```text
1
```

for acute or that Telex uses:

```text
s
```

That mapping belongs to the input-method adapter.

---

# 51. Validation levels

The model should eventually support several levels of validation.

Conceptually:

```text
UNRECOGNIZED
INTERMEDIATE
STRUCTURALLY_VALID
```

Additional information may include:

```text
tone-compatible
onset-compatible
rime-compatible
```

The implementation should avoid a single overly broad Boolean such as:

```js
isVietnamese()
```

because several distinct questions exist:

```text
Can this state continue composition?

Is this a structurally complete syllable?

Is this tone permitted by the ending?

Is this spelling canonical?

Is this an actual Vietnamese word?
```

Only the first several belong to the initial engine.

Lexical validity does not.

---

# 52. Initial permissiveness

The first VIWP.IME implementation should favor correct composition over aggressive rejection.

Therefore the parser may initially recognize a somewhat broader set of composable states than the final strict orthographic grammar.

This is intentional.

A conservative foreign-text protection layer may later use stricter structural information.

The grammar should therefore be designed so that validation can become more precise without redesigning the transformation engine.

---

# 53. Grammar data should evolve from tests

The final inventories of:

```text
medial–nucleus combinations
nucleus–ending combinations
contextual spellings
special onset interactions
```

should be established through:

1. orthographic references;
2. existing Vietnamese syllable inventories;
3. representative real-world Vietnamese text;
4. comparison with established input methods where behavior matters;
5. generated tests;
6. explicit regression cases.

A single exploratory table should not silently become the project's normative language specification.

---

# 54. Source hierarchy

When orthographic behavior needs to be resolved, sources should be considered roughly in the following order:

1. Unicode for character representation and normalization;
2. established descriptions of Vietnamese orthography and syllable structure;
3. educational or linguistic descriptions of Vietnamese spelling conventions;
4. existing Vietnamese input-method behavior where typing convention rather than orthography is the question;
5. computational syllable inventories as coverage resources;
6. project-specific decisions documented explicitly where sources do not uniquely determine behavior.

Existing software behavior should not automatically override Vietnamese orthographic structure.

Likewise, a linguistic analysis should not automatically dictate an awkward software representation if the same written behavior can be modeled more simply and accurately.

---

# 55. Research references

The initial model has been informed by several categories of sources.

## Unicode Standard

The Unicode Standard documents:

* the twelve modern Vietnamese vowel letters;
* the five tone marks;
* precomposed Vietnamese characters;
* canonical decomposition;
* NFC and NFD;
* relevant combining marks.

This is the normative source for Unicode representation.

## Vietnamese syllable-structure descriptions

Linguistic and computational descriptions commonly model the syllable using an onset and rime, with the rime further analyzable into medial, nucleus, and coda/ending.

There is disagreement over some phonological details, especially the status of the /w/-like medial, so VIWP.IME intentionally adopts these categories as an orthographic engineering model rather than a complete phonological theory.

## Luong Hieu Thi, “All syllables in Vietnamese language” (2017)

This work provides a useful orthographic rime matrix, onset table, and large candidate syllable inventory.

Its author explicitly prioritizes recall over precision.

VIWP.IME therefore uses it as a research and coverage resource, not as a normative whitelist.

## Tone-placement descriptions

Vietnamese orthographic references document the coexistence of traditional and reformed placement conventions, particularly in open `oa`, `oe`, and `uy` structures.

VIWP.IME uses the traditional convention as its initial default while modeling tone placement as a policy so that both can share the same engine.

---

# 56. Open modeling questions

The following issues are intentionally not frozen by this document.

## 56.1 Exact grammar inventory

The complete allowed inventory of every:

```text
medial
×
nucleus
×
ending
```

combination still needs to be converted into verified machine-readable data.

## 56.2 Representation of `gi`

The required surface behavior is defined, but the cleanest internal representation remains to be established through implementation experiments.

## 56.3 NFD-first parsing

Unicode decomposition is promising for extracting tone and vowel diacritics, but whether the parser should internally operate primarily on NFD must be tested rather than assumed.

## 56.4 Strict spelling validation

The final boundary between:

```text
valid intermediate state
```

and:

```text
literal non-Vietnamese input
```

will be refined after the basic engine works correctly.

## 56.5 Rare and borrowed structures

Rare Vietnamese forms, established loanwords, dialectal spellings, minority-language names, and onomatopoeic structures should not block the initial engine.

Their treatment can be expanded based on real requirements.

---

# 57. Summary

The central VIWP.IME orthographic model is:

```text
OrthographicSyllable
│
├── onset?
│
├── rime
│   ├── medial?
│   ├── nucleus
│   └── ending?
│       ├── consonantal coda
│       └── off-glide
│
└── tone
```

with several additional principles:

```text
tone
≠
tone-mark position
```

```text
vowel diacritic
≠
tone
```

```text
final orthographic grammar
≠
composition grammar
```

```text
structural validity
≠
lexical validity
```

```text
input-method command
≠
Vietnamese orthographic operation
```

and:

```text
surface Unicode
≠
semantic composition state
```

The model should allow the engine to parse the current Vietnamese composition, apply an input-method-independent semantic transformation, and rerender the resulting orthographic state deterministically.

That model—rather than a large collection of ordered replacement expressions—should be the foundation of VIWP.IME.
