# VIME engine algorithm

This document describes how the current VIME engine works from a jQuery.IME
input window to rendered Vietnamese output. It is descriptive of the current
implementation, not a proposal for a different engine.

The goal is to make `rules/vi/vi.js` understandable without turning every
implementation detail into a public API. Exhaustive rime data belongs in code
and focused tests, not in this document.

## Pipeline

At the jQuery.IME boundary, every Vietnamese method follows the same shape:

```text
jQuery.IME input window
    -> input-method adapter
    -> adapter decoding
        |
        |-- semantic command
        |       -> extract candidate
        |       -> engine.transformCandidate()
        |       -> parse and analyze source state
        |       -> transform semantic state
        |       -> re-analyze and reclassify resulting state
        |       -> render NFC output
        |
        |-- literal adapter output
        |       -> extract candidate
        |       -> adapter replacement
        |
        `-- no command
                -> extract candidate
                -> engine.reflowCandidate()
                -> parse and analyze source state
                -> render NFC output if tone target changed
```

The adapters are intentionally thin. They translate method-specific keys into
semantic commands such as:

```text
VNI 1      -> apply tone acute
Telex s    -> apply tone acute
VIQR '     -> apply tone acute
VIQR* '    -> apply tone acute
VNI 9      -> apply d-stroke
Telex dd   -> apply d-stroke
VIQR dd    -> apply d-stroke
```

Vietnamese parsing, tone placement, vowel-diacritic handling, validation, and
rendering are shared by all methods.

## jQuery.IME boundary

Each Vietnamese input method registers a functional `patterns` rule. jQuery.IME
calls it as:

```javascript
patterns( input, context )
```

`input` is the text window before the caret plus the latest key. Its length is
bounded by `maxKeyLength`. VIME sets this to `16` for the Vietnamese methods.

`context` is raw key context. VIME currently keeps `contextLength = 0`, because
ordinary Vietnamese composition is reconstructed from rendered text near the
caret rather than from persistent raw key history.

The adapter returns either a replacement object:

```javascript
{
    noop: false,
    output: "replacement text"
}
```

or pass-through:

```javascript
{
    noop: true,
    output: input
}
```

When `noop` is false, jQuery.IME replaces the whole input window. For that
reason VIME preserves any unchanged prefix and replaces only the extracted
Vietnamese candidate within that window.

VIQR and VIQR* also expose a small `patterns_shift` bridge. jQuery.IME gives
`patterns_shift` priority when Shift is pressed, and shifted VIQR punctuation
needs to delegate back into the same functional adapter.

## Candidate extraction

`extractCandidate( input, commandKey )` splits the input window into:

```text
prefix + candidate + commandKey
```

The candidate scan walks left from the command key while characters are
candidate code units:

* ASCII letters;
* precomposed Vietnamese Latin characters in the covered Unicode range;
* combining marks.

Text outside that run remains prefix text and is copied through unchanged.
This lets an input window such as `foo toán1` transform only `toán` while
preserving `foo `.

For ordinary letter extension with no decoded command, the adapter extracts the
candidate with an empty command key and asks the engine whether tone placement
should be reflowed.

## Semantic state

The parser normalizes the candidate to NFD, then builds tokens. A token stores
the semantic parts of a rendered character:

* base letter;
* whether the token is a vowel;
* `đ` state for `d`;
* vowel diacritic, if any;
* tone, if this rendered surface already carries a tone mark.

Tone is also stored on the candidate state as a semantic value. Rendering later
decides which token should visibly carry the tone mark. This is why VIME can
change `tóan` to `toán` without treating “move tone mark” as a primary command.

After tokenization, the parser analyzes the written structure:

```text
onset + rime
rime = nucleus material + ending
```

The structure records:

* onset boundary;
* rime text;
* ending;
* checked-ending status;
* eligible vowel token indices;
* finite rime-recognition status;
* resolved tone-target index.

Special onset handling keeps `qu` and `gi` from behaving like ordinary vowel
material when another vowel follows.

## Finite rime recognizer

The recognizer is a structural gate, not a dictionary and not a foreign-language
detector. It answers whether the current rime shape is covered by the Vietnamese
composition model.

The current inventory has two explicit sets:

| Inventory | Meaning |
| --- | --- |
| `complete` | Rimes recognized as complete structures in the current VIME composition model. |
| `composable` | Source spellings accepted only as intermediate composition precursors. |

Prefix statuses are derived from both inventories. For example, a shorter rime
can be accepted as a prefix of a longer covered rime while the user is still
typing.

The recognizer returns these statuses:

| Rime status | Candidate state | Meaning |
| --- | --- | --- |
| `COMPLETE` | `STRUCTURALLY_VALID` | The rime is complete in the current composition model. |
| `COMPLETE_AND_PREFIX` | `STRUCTURALLY_VALID` | The rime is complete in the current model and can also grow into a longer covered rime. |
| `COMPOSABLE` | `INTERMEDIATE` | The rime is a valid composition precursor but not final-looking Vietnamese. |
| `PREFIX` | `INTERMEDIATE` | The rime is a prefix of a covered longer rime. |
| `INVALID` | `UNRECOGNIZED` | The rime is outside the current model. |

This split is important for Telex. Literal delayed-command disambiguation should
prefer a newly typed letter when the whole candidate is already
`STRUCTURALLY_VALID`, but semantic transforms may still operate on
`INTERMEDIATE` candidates.

Example:

```text
hoaos -> hoáo
```

When the final `o` is typed, `oao` is recognized as a complete rime, so Telex
keeps that `o` literal and applies the following `s` as a tone command.

Example:

```text
thuongwf -> thường
```

The source rime `uong` is a composition precursor. It can still receive a later
horn command and render as `ương`.

## Semantic commands

The engine accepts semantic commands, not direct string substitutions:

* apply tone;
* remove tone;
* apply vowel diacritic;
* apply d-stroke.

Each command operates on the parsed state and returns a new state plus any
literal suffix needed for escape behavior.

There are two structural gates:

```text
pre-transform:
    source state must not be UNRECOGNIZED

post-transform:
    transformed semantic state must not become UNRECOGNIZED
```

The post-transform gate re-analyzes and reclassifies the transformed semantic
state before rendering it. It does not render output and then parse that output
again.

Repeated-key escape is handled semantically. If a command repeats an already
present value, the engine can remove the value and append the command key
literally. This keeps escape behavior method-specific at the key layer but
shared at the state layer.

For vowel-diacritic commands, repeated-key escape is delayed while the same
command can still apply to another eligible unmarked vowel in the candidate.
This preserves explicit multi-vowel spellings such as:

```text
lo6o62ng -> lôồng
```

Checked syllables accept only acute (`sắc`) and dot (`nặng`) tone commands. Incompatible checked
tone commands pass through rather than rendering nonstandard checked-tone forms.

## Vowel-diacritic behavior

Vowel-diacritic commands target eligible vowels according to the parsed
structure. The engine uses ordered semantic precedence rather than a broad
substitution table.

For horn commands, the covered precedence is:

```text
uô -> ươ
unmarked uo family -> ươ
ua -> ưa
same-base switch, such as ô -> ơ
simple application, such as o -> ơ or u -> ư
```

For circumflex commands, the covered precedence is:

```text
ươ -> uô
same-base switch, such as ơ -> ô or ă -> â
simple application, such as a -> â, e -> ê, or o -> ô
```

For breve commands, the covered precedence is:

```text
same-base switch, such as â -> ă
simple application, such as a -> ă
```

The precedence matters because several visible results can share letters but
represent different composition structures. Every accepted transformation is
still re-analyzed and reclassified before rendering. If the resulting semantic
state is unrecognized, the adapter passes the original input through.

## Tone placement

Tone placement is a rendering policy. The engine keeps the semantic tone
independent from the visible mark and recalculates the mark position whenever it
renders the state.

The default policy is traditional tone placement:

```text
hòa
xóa
hủy
```

The reformed variants use the same adapters and engine with a different
tone-placement policy:

```text
hoà
xoá
huỷ
```

The policy difference is visible mainly for open `oa`, `oe`, and `uy` rimes.
Rimes with endings usually converge because the ending changes the tone target.

Tone-target resolution is an ordered resolver:

```text
no eligible vowel
    -> no target

one eligible vowel
    -> that vowel

open oa / oe / uy
    -> policy-specific target

known rime or nucleus family
    -> explicit family target

final off-glide i / y / o / u
    -> previous eligible vowel

otherwise
    -> last eligible vowel
```

The open `oa`, `oe`, and `uy` policy branch comes before the general family and
off-glide branches. This is what lets traditional and reformed placement differ
only where the policy intentionally differs.

## Rendering

Rendering writes tokens back to text in NFC form:

```text
semantic state
    -> resolve tone target
    -> render each token with vowel diacritic and at most one tone mark
    -> normalize NFC
```

Case is preserved from the original token bases. `D` with d-stroke renders as
`Đ`; `d` with d-stroke renders as `đ`.

## Tone reflow

When the adapter decodes no command, it may still ask the engine to re-render
the candidate. Reflow only handles candidates that already have a semantic tone.
If rendering would not change the text, the engine reports `handled: false`.

This covers ordinary extension after an early tone command:

```text
to1     -> tó
to1an   -> toán

hoa2    -> hòa
hoa2n   -> hoàn
```

The same mechanism is structural rather than lexical. It does not decide
whether a word exists; it only re-renders a recognized candidate whose tone
target changes after more letters are typed.

## Telex disambiguation

Telex has more ambiguity than VNI and VIQR because ordinary letters can also be
commands. VIME resolves the covered cases in this order:

1. Decode direct command keys before delayed vowel-diacritic ambiguity handling.
2. For delayed vowel-diacritic letters such as `a`, `e`, `o`, and `w`, first
   check whether the literal candidate including the new key is already
   structurally valid.
3. If literal structure is valid, keep the new key literal.
4. Otherwise, test whether the previous candidate has or can receive the
   requested vowel diacritic.
5. If a semantic transform would produce an unrecognized semantic state, pass
   through.

This gives behavior such as:

```text
thayas  -> thấy
thayw   -> thayw
hoaos   -> hoáo
hoeos   -> hoéo
huaws   -> hứa
dacds   -> đác
droid   -> droid
```

The recognizer is doing structural work here. It is not hard-coding words such
as `droid`, and it is not maintaining persistent raw key history.

## Worked examples

### `to1an -> toán`

1. `to1` decodes `1` as acute.
2. The candidate `to` parses as structurally valid.
3. The engine applies acute and renders `tó`.
4. Later `a` and `n` are ordinary letters, so the adapter asks for reflow.
5. `tóan` parses with semantic tone acute and rime `oan`.
6. Traditional rendering places the tone on `a`, producing `toán`.

### `thuongwf -> thường`

1. `w` is considered as a delayed vowel-diacritic command.
2. The source structure is a covered composition precursor.
3. The engine applies horn in the `uong -> ương` path.
4. `f` applies grave.
5. Rendering produces `thường`.

### `hoaos -> hoáo`

1. The second `o` is a possible delayed circumflex key in Telex.
2. The literal candidate `hoao` has the complete rime `oao`.
3. The adapter keeps the final `o` literal.
4. `s` applies acute to the recognized rime and renders `hoáo`.

### `thayw -> thayw`

1. `w` could be a delayed breve or horn command.
2. The preceding rime ends in the off-glide `y`.
3. A semantic transform would not produce a recognized Vietnamese composition
   state.
4. The adapter passes the input through.

### `droid -> droid`

1. The final `d` is decoded as a possible d-stroke command.
2. The extracted source candidate is `droi`.
3. `droi` is already `UNRECOGNIZED`.
4. The pre-transform gate refuses semantic transformation on an unrecognized
   state.
5. The adapter passes the original input through.

## Current limitations

VIME is not a dictionary and does not validate whether a Vietnamese-looking word
is lexically real.

The finite recognizer covers the current tested composition inventory. Rare,
historical, dialectal, minority-language, or specialized spellings may need
explicit structural discussion and tests before they are added.

Some Telex ambiguity is inherent without a raw-key history or a user-facing
spell-check option. The current strategy is to accept covered Vietnamese
composition behavior while passing through structurally impossible candidates.

The current jQuery.IME-hosted package keeps all Vietnamese implementation in
`rules/vi/vi.js`. A later standalone VIME package may split data, parser,
engine, and adapters differently.
