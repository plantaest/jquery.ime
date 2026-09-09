( function ( $ ) {
	'use strict';

	function loadVietnameseSource( assert ) {
		var done = assert.async();

		$.ime.load( 'vi-vni' ).then( () => {
			done();
		}, () => {
			assert.true( false, 'Vietnamese shared source loads before VIWP.IME tests run' );
			done();
		} );
	}

	QUnit.module( 'VIWP.IME – Phase 1 integration spike', {
		before: loadVietnameseSource
	} );

	QUnit.test( 'Vietnamese input methods are registered through shared source metadata', ( assert ) => {
		assert.deepEqual(
			$.ime.languages.vi.inputmethods,
			[ 'vi-vni', 'vi-telex', 'vi-viqr' ],
			'Vietnamese exposes VNI, Telex, and VIQR input methods'
		);
		assert.strictEqual(
			$.ime.sources[ 'vi-vni' ].source,
			'rules/vi/vi.js',
			'VNI uses the shared Vietnamese rule source'
		);
		assert.strictEqual(
			$.ime.sources[ 'vi-telex' ].source,
			$.ime.sources[ 'vi-vni' ].source,
			'Telex uses the same shared Vietnamese rule source'
		);
		assert.strictEqual(
			$.ime.sources[ 'vi-viqr' ].source,
			$.ime.sources[ 'vi-vni' ].source,
			'VIQR uses the same shared Vietnamese rule source'
		);
	} );

	QUnit.test( 'Loading one Vietnamese method registers the shared engine and all adapters', ( assert ) => {
		assert.strictEqual(
			typeof $.ime.vi.createAdapter,
			'function',
			'Shared Vietnamese adapter factory is exposed for unit tests'
		);
		assert.strictEqual(
			typeof $.ime.inputmethods[ 'vi-vni' ].patterns,
			'function',
			'VNI adapter provides functional patterns'
		);
		assert.strictEqual(
			typeof $.ime.inputmethods[ 'vi-telex' ].patterns,
			'function',
			'Telex adapter is registered by the shared source'
		);
		assert.strictEqual(
			typeof $.ime.inputmethods[ 'vi-viqr' ].patterns,
			'function',
			'VIQR adapter is registered by the shared source'
		);
	} );

	QUnit.test( 'Vietnamese adapter maps handled engine output to jQuery.IME patterns result', ( assert ) => {
		var adapter, result;

		adapter = $.ime.vi.createAdapter( {
			inputMethodId: 'vi-vni',
			decodeCommand: function () {
				return {
					key: '1',
					command: {
						type: $.ime.vi.CommandType.APPLY_TONE,
						tone: $.ime.vi.Tone.ACUTE
					}
				};
			},
			engine: {
				transformCandidate: function ( candidate, command, options ) {
					assert.strictEqual( candidate, 'tuong', 'Adapter passes only the extracted candidate to the engine' );
					assert.strictEqual( command.tone, $.ime.vi.Tone.ACUTE, 'Adapter passes the semantic command' );
					assert.strictEqual( options.context, '', 'Adapter forwards jQuery.IME context explicitly' );
					assert.strictEqual( options.inputMethodId, 'vi-vni', 'Adapter forwards input method id explicitly' );

					return {
						handled: true,
						output: 'T'
					};
				}
			}
		} );

		result = adapter( 'hello tuong1', '' );

		assert.deepEqual(
			result,
			{
				noop: false,
				output: 'hello T'
			},
			'Adapter preserves prefix outside the Vietnamese candidate'
		);
	} );

	QUnit.test( 'Vietnamese adapters keep the expected input-window settings', ( assert ) => {
		assert.strictEqual(
			$.ime.inputmethods[ 'vi-vni' ].contextLength,
			0,
			'Vietnamese adapters do not depend on raw input context'
		);
		assert.strictEqual(
			$.ime.inputmethods[ 'vi-vni' ].maxKeyLength,
			$.ime.vi.DEFAULT_MAX_KEY_LENGTH,
			'Vietnamese adapters use the shared maxKeyLength'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-telex' ].patterns( 'a1', '' ),
			{
				noop: true,
				output: 'a1'
			},
			'Telex remains pass-through until its command mapping is specified'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-viqr' ].patterns( 'a1', '' ),
			{
				noop: true,
				output: 'a1'
			},
			'VIQR remains pass-through until its command mapping is specified'
		);
	} );

	QUnit.module( 'VIWP.IME – Unicode', {
		before: loadVietnameseSource
	} );

	QUnit.test( 'Vietnamese parser extracts tone and vowel diacritic from NFC and NFD input', ( assert ) => {
		var parsedAcuteCircumflex = $.ime.vi.parseCandidate( 'ấ' ),
			parsedDecomposedAcute = $.ime.vi.parseCandidate( 'a\u0301' );

		assert.strictEqual(
			parsedAcuteCircumflex.status,
			$.ime.vi.StateType.STRUCTURALLY_VALID,
			'Precomposed Vietnamese vowels parse as structurally valid candidates'
		);
		assert.strictEqual(
			parsedAcuteCircumflex.tone,
			$.ime.vi.Tone.ACUTE,
			'Parser extracts semantic tone from a precomposed character'
		);
		assert.strictEqual(
			parsedAcuteCircumflex.tokens[ 0 ].vowelDiacritic,
			$.ime.vi.VowelDiacritic.CIRCUMFLEX,
			'Parser extracts vowel diacritic separately from tone'
		);
		assert.strictEqual(
			$.ime.vi.renderCandidate( parsedAcuteCircumflex ),
			'ấ',
			'Renderer emits NFC output for precomposed input'
		);
		assert.strictEqual(
			parsedDecomposedAcute.tone,
			$.ime.vi.Tone.ACUTE,
			'Parser accepts canonically decomposed tone input'
		);
		assert.strictEqual(
			$.ime.vi.renderCandidate( parsedDecomposedAcute ),
			'á',
			'Renderer normalizes decomposed input to NFC'
		);
	} );

	QUnit.module( 'VIWP.IME – Transform', {
		before: loadVietnameseSource
	} );

	QUnit.test( 'Vietnamese engine applies and replaces semantic tones', ( assert ) => {
		var tone = $.ime.vi.Tone,
			commandType = $.ime.vi.CommandType;

		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'a', {
				type: commandType.APPLY_TONE,
				tone: tone.ACUTE
			} ),
			{
				handled: true,
				output: 'á'
			},
			'APPLY_TONE(ACUTE) renders a simple vowel'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'á', {
				type: commandType.APPLY_TONE,
				tone: tone.GRAVE
			} ),
			{
				handled: true,
				output: 'à'
			},
			'Applying a new tone replaces the existing semantic tone'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'á', {
				type: commandType.REMOVE_TONE
			} ),
			{
				handled: true,
				output: 'a'
			},
			'REMOVE_TONE removes only the tone from a simple vowel'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'ấ', {
				type: commandType.REMOVE_TONE
			} ),
			{
				handled: true,
				output: 'â'
			},
			'REMOVE_TONE preserves the vowel diacritic'
		);
	} );

	QUnit.test( 'Vietnamese engine applies vowel diacritics while preserving tone', ( assert ) => {
		var vowelDiacritic = $.ime.vi.VowelDiacritic,
			commandType = $.ime.vi.CommandType;

		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'a', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.CIRCUMFLEX
			} ),
			{
				handled: true,
				output: 'â'
			},
			'CIRCUMFLEX applies to a simple a'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'a', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.BREVE
			} ),
			{
				handled: true,
				output: 'ă'
			},
			'BREVE applies to a simple a'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'o', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.HORN
			} ),
			{
				handled: true,
				output: 'ơ'
			},
			'HORN applies to a simple o'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'u', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.HORN
			} ),
			{
				handled: true,
				output: 'ư'
			},
			'HORN applies to a simple u'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'á', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.CIRCUMFLEX
			} ),
			{
				handled: true,
				output: 'ấ'
			},
			'Applying a vowel diacritic preserves semantic tone'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'tuong', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.HORN
			} ),
			{
				handled: true,
				output: 'tương'
			},
			'HORN applies to the uo precursor as ươ'
		);
	} );

	QUnit.test( 'Vietnamese engine handles d-stroke and initial fallback behavior', ( assert ) => {
		var commandType = $.ime.vi.CommandType;

		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'd', {
				type: commandType.APPLY_D_STROKE
			} ),
			{
				handled: true,
				output: 'đ'
			},
			'd-stroke applies to lowercase d'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'D', {
				type: commandType.APPLY_D_STROKE
			} ),
			{
				handled: true,
				output: 'Đ'
			},
			'd-stroke applies to uppercase D'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'bc', {
				type: commandType.APPLY_TONE,
				tone: $.ime.vi.Tone.ACUTE
			} ),
			{
				handled: false
			},
			'Candidates without a vowel pass through tone commands'
		);
	} );

	QUnit.test( 'Vietnamese engine renders traditional tone placement for the vertical slice', ( assert ) => {
		var commandType = $.ime.vi.CommandType;

		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'hoa', {
				type: commandType.APPLY_TONE,
				tone: $.ime.vi.Tone.GRAVE
			} ),
			{
				handled: true,
				output: 'hòa'
			},
			'Traditional open oa placement marks the medial vowel'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'tương', {
				type: commandType.APPLY_TONE,
				tone: $.ime.vi.Tone.GRAVE
			} ),
			{
				handled: true,
				output: 'tường'
			},
			'Complex ươ placement marks the natural nucleus target'
		);
	} );

	QUnit.module( 'VIWP.IME – Adapter', {
		before: loadVietnameseSource
	} );

	QUnit.test( 'VNI adapter calls the shared engine for the Phase 2 vertical slice', ( assert ) => {
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'hello a1', '' ),
			{
				noop: false,
				output: 'hello á'
			},
			'Adapter preserves prefix and replaces a simple toned candidate'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'a6', '' ),
			{
				noop: false,
				output: 'â'
			},
			'Adapter routes VNI vowel-diacritic commands through the shared engine'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'd9', '' ),
			{
				noop: false,
				output: 'đ'
			},
			'Adapter routes VNI d-stroke commands through the shared engine'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'bc1', '' ),
			{
				noop: true,
				output: 'bc1'
			},
			'Adapter passes through commands the vertical-slice engine cannot handle'
		);
	} );
}( jQuery ) );
