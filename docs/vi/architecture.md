# VIWP.IME architecture

This document defines the software architecture for Vietnamese input methods in jQuery.IME.

The important boundary is:

```text
jQuery.IME host
    -> Vietnamese input-method adapter
        -> shared Vietnamese engine
            -> parser / transformer / renderer / validation data
```

## Architectural goals

VIWP.IME must:

* implement Vietnamese input methods through one shared Vietnamese engine;
* keep method-specific key mapping out of Vietnamese orthographic logic;
* model operations semantically;
* keep the engine testable without DOM input simulation;
* use rendered text near the caret as the primary source of composition state;
* keep tone separate from the visible Unicode tone mark;
* avoid a large ordered regex grammar;
* avoid jQuery.IME core changes unless a concrete blocker is proven.

## Current jQuery.IME facts

The Phase 1 integration spike confirmed these repository facts.

Input methods are listed in `src/jquery.ime.inputmethods.js` under `$.ime.sources`. Each source entry names a rule file.

jQuery.IME loads a rule file through `$.ime.load( inputMethodId )`. A loaded rule file calls `$.ime.register( ... )`.

An input method may define `patterns` as a function.

When Shift is pressed, jQuery.IME gives `patterns_shift` priority before ordinary `patterns`. In the current core, `patterns_shift` is array-based, so VIQR-family shifted punctuation uses a small array rule that delegates back to the same functional Vietnamese adapter.

The relevant contract is:

```javascript
patterns: function ( input, context ) {
    return result;
}
```

The return value may be an object:

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

If `noop` is false, jQuery.IME replaces the complete `input` window before the caret with `output`. Therefore the Vietnamese adapter must return unchanged prefix text plus the transformed candidate. It must not return only the transformed syllable when the input window also contains prefix text.

`maxKeyLength` controls how many JavaScript string code units before the caret are included in `input` before the newest key is appended.

`contextLength` controls raw input-key history. It is not the same thing as rendered text before the caret.

The current Vietnamese implementation uses one source file, `rules/vi/vi.js`, to register VNI, Telex, VIQR, VIQR*, and their `-reformed` tone-placement variants. This matches the current jQuery.IME loader better than inventing a shared non-input-method dependency.

## Current packaging recommendation

Use one jQuery.IME rule source for the first implementation:

```text
rules/vi/vi.js
```

That file may contain several internal modules or namespace sections:

```text
Vietnamese namespace
├── constants and enums
├── Unicode helpers
├── orthographic data
├── parser
├── transformer
├── tone-placement resolver
├── renderer
├── validator
└── VNI / Telex / VIQR / VIQR* adapters
```

All Vietnamese metadata entries should point to this source:

```text
vi-vni                -> rules/vi/vi.js
vi-telex              -> rules/vi/vi.js
vi-viqr               -> rules/vi/vi.js
vi-viqr-star          -> rules/vi/vi.js
vi-vni-reformed       -> rules/vi/vi.js
vi-telex-reformed     -> rules/vi/vi.js
vi-viqr-reformed      -> rules/vi/vi.js
vi-viqr-star-reformed -> rules/vi/vi.js
```

Reason: jQuery.IME has a simple rule-file loader. Its existing dependency support is oriented around input methods, not arbitrary shared helper modules. A single shared Vietnamese source is the smallest jQuery.IME-compatible package that preserves one engine.

If `vi.js` becomes too large, a later split may be considered only after proving how those files will be loaded in examples, tests, and distribution builds.

## Layer responsibilities

### jQuery.IME host

jQuery.IME owns:

* keyboard events;
* active input-method selection;
* editable-element abstraction;
* caret and selection handling;
* reading text before the caret;
* replacing text before the caret;
* loading rule files.

Vietnamese code should not duplicate these responsibilities.

### Input-method adapter

Each adapter owns only method-specific behavior:

```text
input key or key sequence
    -> semantic command
```

Examples:

```text
VNI 1    -> APPLY_TONE(ACUTE)
Telex s  -> APPLY_TONE(ACUTE)
VIQR '   -> APPLY_TONE(ACUTE)
VIQR* '  -> APPLY_TONE(ACUTE)
```

Adapters also handle the jQuery.IME `patterns` boundary and narrow method-level literal behavior such as VIQR escape:

```text
jQuery.IME input window
    -> candidate extraction
    -> engine call
    -> jQuery.IME replacement object
```

Adapters must not contain Vietnamese tone-placement rules, parser logic, `qu` handling, `gi` handling, or Unicode rendering tables beyond command decoding.

For ambiguous Telex letters such as `a`, `e`, `o`, `w`, and `d`, the adapter may inspect the parsed target from the shared engine to decide whether the key is a delayed command or literal input. The transformation itself still belongs to the shared engine.

### Shared Vietnamese engine

The shared engine owns:

* Unicode decomposition and composition helpers;
* candidate parsing;
* composition-state classification;
* semantic transformations;
* tone-placement resolution;
* rendering;
* structural validation;
* fallback decisions for unrecognized candidates.

The engine should not depend on:

* DOM APIs;
* jQuery selectors;
* keyboard events;
* caret manipulation;
* editable elements.

## Adapter contract

The current implementation uses this adapter shape:

```javascript
createAdapter( {
    inputMethodId: "vi-vni",
    decodeCommand: decodeVNICommand,
    engine: Vietnamese.engine,
    tonePlacement: Vietnamese.TonePlacement.TRADITIONAL
} )
```

`tonePlacement` defaults to `TonePlacement.TRADITIONAL`. Reformed input methods reuse the same adapters and pass `TonePlacement.REFORMED`; they do not duplicate Vietnamese parsing or transformation logic.

`decodeCommand( input, context, options )` returns either:

```javascript
{
    key: "1",
    command: {
        type: "apply-tone",
        literal: "1",
        tone: "acute"
    }
}
```

or an adapter-level literal replacement:

```javascript
{
    key: "\\?",
    literalOutput: "?"
}
```

or `null`.

The adapter passes these options to decoders:

```javascript
{
    inputMethodId: inputMethodId,
    tonePlacement: tonePlacement
}
```

Most decoders ignore the options. Telex may use `tonePlacement` only to ask shared engine helpers whether an ambiguous delayed command can apply under the current rendering policy.

For semantic commands, the adapter extracts the candidate before the command key and calls:

```javascript
engine.transformCandidate( candidate, command, {
    context: context,
    inputMethodId: inputMethodId,
    tonePlacement: tonePlacement
} );
```

For literal replacements, the adapter extracts the candidate boundary and returns:

```javascript
{
    noop: false,
    output: prefix + candidate + literalOutput
}
```

This is intentionally limited to method-level behavior such as VIQR backslash escape. Vietnamese parsing, tone placement, `qu`, `gi`, and Unicode rendering remain in the shared engine.

The engine returns:

```javascript
{
    handled: true,
    output: "transformed candidate"
}
```

or:

```javascript
{
    handled: false
}
```

If `handled` is false, the adapter returns pass-through:

```javascript
{
    noop: true,
    output: input
}
```

If `handled` is true, the adapter returns:

```javascript
{
    noop: false,
    output: prefix + result.output
}
```

This contract is intentionally small. Add fields only when a tested behavior requires them.

For VNI repeated-key escape, the adapter includes the literal command key in the semantic command object. The engine still reconstructs behavior from the rendered candidate, not from raw key history.

When an input-method decoder returns no command, the shared adapter may still ask the engine to reflow the extracted rendered candidate. This path is intentionally narrower than a semantic command: it re-renders an already toned candidate when ordinary letter input has changed the candidate structure and the resolved tone target changes. For example, `to1an` reaches the adapter as `tóan`, then reflows to `toán`.

The reflow path receives the same `tonePlacement` option as command transformations.

## Candidate extraction

jQuery.IME provides a bounded input window, not a pre-parsed Vietnamese syllable.

The adapter must separate:

```text
[unchanged prefix][candidate][command key]
```

For example:

```text
hello tuong1
```

should become:

```text
prefix:    "hello "
candidate: "tuong"
command:   APPLY_TONE(ACUTE)
```

The adapter must return `hello ` plus the transformed candidate because jQuery.IME replaces the whole input window.

Candidate extraction may use small local character-class logic. The full Vietnamese parser belongs in the shared engine.

## Engine execution flow

The intended engine flow is:

```text
candidate surface text
    -> normalize or decompose as needed
    -> parse candidate
    -> classify as unrecognized, intermediate, or structurally valid
    -> apply semantic command
    -> validate or conservatively accept the new state
    -> resolve tone placement
    -> render Unicode output
    -> normalize output, preferably NFC
```

The engine should be deterministic. If parsing is ambiguous, resolve the ambiguity through explicit orthographic data or documented priority rules, not accidental regex order.

## State model

The rendered candidate near the caret is the primary source of truth.

The engine should reconstruct composition state from the current rendered candidate whenever practical.

Do not rely on a persistent raw-keystroke buffer for ordinary transformations. Raw history is fragile because users can move the caret, delete text, paste text, or reach the same rendered output through different typing orders.

`context` may be used only for narrow behaviors that cannot be represented from rendered text and have a focused test. The current Vietnamese input methods do not require raw `context`.

The Phase 3 parser attaches a rime-aware `structure` object to parsed candidates. It includes the parsed onset, rime, ending, checked-ending flag, eligible vowel indices, and resolved tone target.

## `maxKeyLength` and `contextLength`

Current recommendation:

```text
contextLength:
  all Vietnamese methods 0

maxKeyLength:
  all Vietnamese methods 16

tonePlacement:
  vi-vni, vi-telex, vi-viqr, vi-viqr-star traditional
  vi-vni-reformed, vi-telex-reformed, vi-viqr-reformed, vi-viqr-star-reformed reformed
```

`contextLength = 0` keeps raw key history out of the main composition model.

`maxKeyLength = 16` gives the adapter enough room for ordinary Vietnamese candidates plus a command key while keeping replacement scope bounded. Because this is JavaScript string length, decomposed Unicode may consume more code units than precomposed text.

Tests must cover:

* longest expected ordinary candidates;
* decomposed Unicode input where practical;
* command placement after a coda;
* pass-through when the candidate is outside the available window.

If tests prove `16` is too small or unnecessarily large, update this document and the constant together.

## Dependency direction

Dependencies should flow downward:

```text
adapter
    -> semantic command API
        -> engine
            -> orthographic data
                -> Unicode utilities
```

Avoid circular responsibilities:

* parser must not call a VNI adapter;
* renderer must not inspect keyboard events;
* Unicode helpers must not know Telex or VIQR;
* validator must not modify DOM text.

## Regular expressions

Regular expressions are allowed for small, local tasks:

* candidate boundary checks;
* character classes;
* simple table lookups;
* well-scoped normalization helpers.

Do not implement Vietnamese composition as a large ordered regex grammar whose correctness depends on rule order.

## Public and test APIs

The product surface is the jQuery.IME input methods, not a general-purpose Vietnamese library.

Still, pure engine pieces should be reachable from QUnit tests. The preferred compromise is a small `$.ime.vi` namespace exposing only stable internal seams needed for tests:

```text
createAdapter()
TonePlacement
decodeVNICommand()
decodeTelexCommand()
decodeVIQRCommand()
decodeVIQRStarCommand()
engine.transformCandidate()
engine.reflowCandidate()
parseCandidate()
renderCandidate()
```

Avoid exposing a large public API before implementation proves it is needed.

## Files expected in the current integration

The minimum jQuery.IME-facing files are:

```text
rules/vi/vi.js
src/jquery.ime.inputmethods.js
test/index.html
test/jquery.ime.vi.test.js
test/jquery.ime.vi.test.fixtures.js
```

Keep Vietnamese-specific tests out of `test/jquery.ime.test.js` and `test/jquery.ime.test.fixtures.js` so the generic jQuery.IME runner and fixture corpus remain easy to compare.

Possible later files:

```text
examples/
docs/
```

Only add or modify jQuery.IME core files after documenting a concrete blocker.

## Known constraints and open questions

Confirmed:

* one shared Vietnamese source can register VNI, Telex, VIQR, and VIQR*;
* functional `patterns` can call a shared engine;
* adapter output must include the unchanged prefix from the jQuery.IME input window;
* the current Vietnamese input methods do not require raw `context`;
* focused QUnit modules can be run through Grunt;
* the shared engine can use NFD internally while rendering NFC output;
* VNI repeated-key escape can be implemented from rendered text;
* Telex repeated-key escape can be implemented from rendered text for covered tone, vowel-diacritic, and `d`/`đ` commands;
* Telex can leave standalone `w`, `[`, and `]` as literal input without raw-context exceptions;
* VIQR backslash escape can be implemented as adapter-level literal output;
* VIQR* can share the VIQR adapter shape with a different horn key;
* VIQR and VIQR* shifted punctuation can be handled by a `patterns_shift` bridge without jQuery.IME core changes;
* VIQR and VIQR* delayed d-stroke can reuse the shared d-stroke command without jQuery.IME core changes;
* tone reflow after ordinary letter extension can be implemented from rendered text without raw `context`, for covered cases such as `to1an -> toán` and `hoa2n -> hoàn`;
* traditional and reformed tone-placement policies can be exposed as separate input-method ids without jQuery.IME core changes;
* incompatible checked-tone commands can pass through without jQuery.IME core changes;
* Telex can protect a small set of covered literal rimes such as `oao` and `oeo` during delayed-command disambiguation without jQuery.IME core changes.

Unresolved:

* whether Telex `z` should remove only tone, or also vowel diacritics, beyond the current tone-removal behavior;
* whether a future file split is worth the extra loader complexity;
* how strict initial structural validation should be for foreign-like candidates such as `david` and `droid`.

## Architecture acceptance criteria

The architecture is successful when:

* VNI, Telex, VIQR, and VIQR* share one engine;
* adding a new Vietnamese typing convention mainly requires a new adapter;
* pure engine behavior is tested without DOM input simulation;
* tone placement is rendered from semantic state;
* intermediate states are explicit;
* Unicode output is correct;
* jQuery.IME core remains unchanged unless a documented blocker exists;
* future contributors can understand the implementation from code, tests, and these docs.
