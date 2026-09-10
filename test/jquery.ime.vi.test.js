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
			[ 'vi-vni', 'vi-telex', 'vi-viqr', 'vi-viqr-star' ],
			'Vietnamese exposes VNI, Telex, VIQR, and VIQR* input methods'
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
		assert.strictEqual(
			$.ime.sources[ 'vi-viqr-star' ].source,
			$.ime.sources[ 'vi-vni' ].source,
			'VIQR* uses the same shared Vietnamese rule source'
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
		assert.strictEqual(
			typeof $.ime.inputmethods[ 'vi-viqr-star' ].patterns,
			'function',
			'VIQR* adapter is registered by the shared source'
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
		[ 'vi-vni', 'vi-telex', 'vi-viqr', 'vi-viqr-star' ].forEach( ( inputMethodId ) => {
			assert.strictEqual(
				$.ime.inputmethods[ inputMethodId ].contextLength,
				0,
				inputMethodId + ' does not depend on raw input context'
			);
			assert.strictEqual(
				$.ime.inputmethods[ inputMethodId ].maxKeyLength,
				$.ime.vi.DEFAULT_MAX_KEY_LENGTH,
				inputMethodId + ' uses the shared maxKeyLength'
			);
		} );
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

	QUnit.module( 'VIWP.IME – Parser', {
		before: loadVietnameseSource
	} );

	QUnit.test( 'Vietnamese parser identifies onset, rime, and checked endings', ( assert ) => {
		var parsedQuoc = $.ime.vi.parseCandidate( 'quoc' ),
			parsedGieng = $.ime.vi.parseCandidate( 'gieng' ),
			parsedKhuay = $.ime.vi.parseCandidate( 'khuay' ),
			parsedHuya = $.ime.vi.parseCandidate( 'huya' ),
			parsedMat = $.ime.vi.parseCandidate( 'mat' );

		assert.strictEqual( parsedQuoc.structure.onset, 'qu', 'qu is represented as a special onset' );
		assert.strictEqual( parsedQuoc.structure.rime, 'oc', 'The u in qu is not part of the rime' );
		assert.strictEqual( parsedQuoc.structure.toneTargetIndex, 2, 'quoc places tone on o' );

		assert.strictEqual( parsedGieng.structure.onset, 'gi', 'gi is represented as a special onset before another vowel' );
		assert.strictEqual( parsedGieng.structure.rime, 'eng', 'The i in gi is not part of the rime before another vowel' );
		assert.strictEqual( parsedGieng.structure.toneTargetIndex, 2, 'gieng places tone on e' );

		assert.strictEqual( parsedKhuay.structure.onset, 'kh', 'kh is parsed as a multi-letter onset' );
		assert.strictEqual( parsedKhuay.structure.rime, 'uay', 'khuay keeps the medial and off-glide inside the rime' );
		assert.strictEqual( parsedKhuay.structure.toneTargetIndex, 3, 'khuay places tone on a' );

		assert.strictEqual( parsedHuya.structure.rime, 'uya', 'huya keeps the rare uya rime together' );
		assert.strictEqual( parsedHuya.structure.toneTargetIndex, 2, 'huya places tone on y' );

		assert.strictEqual( parsedMat.structure.ending, 't', 'mat has a t ending' );
		assert.true( parsedMat.structure.checked, 'mat is recognized as a checked syllable' );
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
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'tường', {
				type: commandType.REMOVE_TONE
			} ),
			{
				handled: true,
				output: 'tương'
			},
			'REMOVE_TONE preserves a complex vowel nucleus'
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
			$.ime.vi.engine.transformCandidate( 'hâm', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.BREVE
			} ),
			{
				handled: true,
				output: 'hăm'
			},
			'BREVE changes a circumflex a target to breve'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'hắm', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.CIRCUMFLEX
			} ),
			{
				handled: true,
				output: 'hấm'
			},
			'CIRCUMFLEX changes a breve a target to circumflex while preserving tone'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'hốp', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.HORN
			} ),
			{
				handled: true,
				output: 'hớp'
			},
			'HORN changes a circumflex o target to horn while preserving tone'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'hớp', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.CIRCUMFLEX
			} ),
			{
				handled: true,
				output: 'hốp'
			},
			'CIRCUMFLEX changes a horned o target to circumflex while preserving tone'
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
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'huo', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.HORN
			} ),
			{
				handled: true,
				output: 'huơ'
			},
			'HORN on open uo applies to o as uơ'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'hua', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.HORN
			} ),
			{
				handled: true,
				output: 'hưa'
			},
			'HORN applies to the ua precursor as ưa'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'lôo', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				literal: '6',
				vowelDiacritic: vowelDiacritic.CIRCUMFLEX
			} ),
			{
				handled: true,
				output: 'lôô'
			},
			'CIRCUMFLEX applies to another eligible vowel before using repeated-key escape'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'huốp', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.HORN
			} ),
			{
				handled: true,
				output: 'hướp'
			},
			'HORN changes uô to ươ while preserving tone'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'hướp', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.CIRCUMFLEX
			} ),
			{
				handled: true,
				output: 'huốp'
			},
			'CIRCUMFLEX changes ươ to uô while preserving tone'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'thay', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.CIRCUMFLEX
			} ),
			{
				handled: true,
				output: 'thây'
			},
			'CIRCUMFLEX applies to the nucleus before an off-glide'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'khuay', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.CIRCUMFLEX
			} ),
			{
				handled: true,
				output: 'khuây'
			},
			'CIRCUMFLEX applies to a after a medial u'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'quoc', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.CIRCUMFLEX
			} ),
			{
				handled: true,
				output: 'quôc'
			},
			'CIRCUMFLEX ignores the u in qu and applies to o'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'gieng', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.CIRCUMFLEX
			} ),
			{
				handled: true,
				output: 'giêng'
			},
			'CIRCUMFLEX ignores the i in gi and applies to e'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'tháy', {
				type: commandType.APPLY_VOWEL_DIACRITIC,
				vowelDiacritic: vowelDiacritic.CIRCUMFLEX
			} ),
			{
				handled: true,
				output: 'thấy'
			},
			'CIRCUMFLEX after a tone command preserves and repositions tone'
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
			$.ime.vi.engine.transformCandidate( 'dac', {
				type: commandType.APPLY_D_STROKE
			} ),
			{
				handled: true,
				output: 'đac'
			},
			'd-stroke applies to the candidate onset after rime material'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'Dac', {
				type: commandType.APPLY_D_STROKE
			} ),
			{
				handled: true,
				output: 'Đac'
			},
			'd-stroke preserves uppercase onset after rime material'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'đác', {
				type: commandType.APPLY_D_STROKE,
				literal: '9'
			} ),
			{
				handled: true,
				output: 'dác9'
			},
			'repeated d-stroke key escapes after the full candidate is already rendered'
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

	QUnit.module( 'VIWP.IME – Tone placement', {
		before: loadVietnameseSource
	} );

	QUnit.test( 'Vietnamese engine resolves Phase 3 tone-placement regressions', ( assert ) => {
		var tone = $.ime.vi.Tone,
			commandType = $.ime.vi.CommandType;

		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'coi', {
				type: commandType.APPLY_TONE,
				tone: tone.TILDE
			} ),
			{
				handled: true,
				output: 'cõi'
			},
			'oi places tone on o, not i'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'kheo', {
				type: commandType.APPLY_TONE,
				tone: tone.ACUTE
			} ),
			{
				handled: true,
				output: 'khéo'
			},
			'eo places tone on e, not o'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'thây', {
				type: commandType.APPLY_TONE,
				tone: tone.ACUTE
			} ),
			{
				handled: true,
				output: 'thấy'
			},
			'ây places tone on â, not y'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'khuây', {
				type: commandType.APPLY_TONE,
				tone: tone.ACUTE
			} ),
			{
				handled: true,
				output: 'khuấy'
			},
			'uây places tone on â, not y'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'hoan', {
				type: commandType.APPLY_TONE,
				tone: tone.GRAVE
			} ),
			{
				handled: true,
				output: 'hoàn'
			},
			'oa plus ending places tone on a'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'huy', {
				type: commandType.APPLY_TONE,
				tone: tone.HOOK
			} ),
			{
				handled: true,
				output: 'hủy'
			},
			'Open uy keeps traditional tone placement on u'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'huynh', {
				type: commandType.APPLY_TONE,
				tone: tone.GRAVE
			} ),
			{
				handled: true,
				output: 'huỳnh'
			},
			'uy plus ending places tone on y'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'huya', {
				type: commandType.APPLY_TONE,
				tone: tone.ACUTE
			} ),
			{
				handled: true,
				output: 'huýa'
			},
			'uya places tone on y'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'hoao', {
				type: commandType.APPLY_TONE,
				tone: tone.ACUTE
			} ),
			{
				handled: true,
				output: 'hoáo'
			},
			'oao treats final o as an off-glide for tone placement'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'hoeo', {
				type: commandType.APPLY_TONE,
				tone: tone.ACUTE
			} ),
			{
				handled: true,
				output: 'hoéo'
			},
			'oeo treats final o as an off-glide for tone placement'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'THÂY', {
				type: commandType.APPLY_TONE,
				tone: tone.ACUTE
			} ),
			{
				handled: true,
				output: 'THẤY'
			},
			'Uppercase candidates keep case while resolving tone placement'
		);
	} );

	QUnit.test( 'Vietnamese engine handles qu, gi, and checked-tone structure', ( assert ) => {
		var tone = $.ime.vi.Tone,
			commandType = $.ime.vi.CommandType;

		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'quôc', {
				type: commandType.APPLY_TONE,
				tone: tone.ACUTE
			} ),
			{
				handled: true,
				output: 'quốc'
			},
			'quốc places tone on ô'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'giêng', {
				type: commandType.APPLY_TONE,
				tone: tone.ACUTE
			} ),
			{
				handled: true,
				output: 'giếng'
			},
			'giếng places tone on ê'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'mat', {
				type: commandType.APPLY_TONE,
				tone: tone.ACUTE
			} ),
			{
				handled: true,
				output: 'mát'
			},
			'Checked syllables accept acute tone'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'mat', {
				type: commandType.APPLY_TONE,
				tone: tone.DOT
			} ),
			{
				handled: true,
				output: 'mạt'
			},
			'Checked syllables accept dot tone'
		);
		assert.deepEqual(
			$.ime.vi.engine.transformCandidate( 'mat', {
				type: commandType.APPLY_TONE,
				tone: tone.GRAVE
			} ),
			{
				handled: false
			},
			'Checked syllables reject incompatible tone commands conservatively'
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
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'dac9', '' ),
			{
				noop: false,
				output: 'đac'
			},
			'Adapter routes VNI d-stroke commands after rime material'
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

	QUnit.test( 'VNI adapter supports Phase 3 typing behavior and repeated-key escape', ( assert ) => {
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'coi4', '' ),
			{
				noop: false,
				output: 'cõi'
			},
			'VNI oi tone placement reaches the engine'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'kheo1', '' ),
			{
				noop: false,
				output: 'khéo'
			},
			'VNI eo tone placement reaches the engine'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'thay6', '' ),
			{
				noop: false,
				output: 'thây'
			},
			'VNI circumflex can target a before y'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'thây1', '' ),
			{
				noop: false,
				output: 'thấy'
			},
			'VNI tone after vowel-diacritic command keeps the tone target'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'huo7', '' ),
			{
				noop: false,
				output: 'huơ'
			},
			'VNI horn on open uo keeps u unmarked'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'lôo6', '' ),
			{
				noop: false,
				output: 'lôô'
			},
			'VNI repeated circumflex applies to another eligible vowel before escaping'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'huốp7', '' ),
			{
				noop: false,
				output: 'hướp'
			},
			'VNI horn changes rendered uô to ươ'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'hướp6', '' ),
			{
				noop: false,
				output: 'huốp'
			},
			'VNI circumflex changes rendered ươ to uô'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'huya1', '' ),
			{
				noop: false,
				output: 'huýa'
			},
			'VNI tone placement handles the rare uya rime'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'quoc6', '' ),
			{
				noop: false,
				output: 'quôc'
			},
			'VNI circumflex ignores the u in qu'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'giêng1', '' ),
			{
				noop: false,
				output: 'giếng'
			},
			'VNI tone ignores the i in gi before another vowel'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'á1', '' ),
			{
				noop: false,
				output: 'a1'
			},
			'Repeating a tone key escapes to literal VNI input'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'â6', '' ),
			{
				noop: false,
				output: 'a6'
			},
			'Repeating a vowel-diacritic key escapes to literal VNI input'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'đ9', '' ),
			{
				noop: false,
				output: 'd9'
			},
			'Repeating d-stroke key escapes to literal VNI input'
		);
		assert.deepEqual(
			$.ime.inputmethods[ 'vi-vni' ].patterns( 'đác9', '' ),
			{
				noop: false,
				output: 'dác9'
			},
			'Repeating d-stroke key escapes after a full rendered candidate'
		);
	} );

	QUnit.module( 'VIWP.IME – Telex adapter', {
		before: loadVietnameseSource
	} );

	QUnit.test( 'Telex adapter maps tone, vowel-diacritic, and d-stroke keys', ( assert ) => {
		var telex = $.ime.inputmethods[ 'vi-telex' ].patterns;

		assert.deepEqual(
			telex( 'as', '' ),
			{
				noop: false,
				output: 'á'
			},
			'Telex s applies acute tone'
		);
		assert.deepEqual(
			telex( 'af', '' ),
			{
				noop: false,
				output: 'à'
			},
			'Telex f applies grave tone'
		);
		assert.deepEqual(
			telex( 'ar', '' ),
			{
				noop: false,
				output: 'ả'
			},
			'Telex r applies hook tone'
		);
		assert.deepEqual(
			telex( 'ax', '' ),
			{
				noop: false,
				output: 'ã'
			},
			'Telex x applies tilde tone'
		);
		assert.deepEqual(
			telex( 'aj', '' ),
			{
				noop: false,
				output: 'ạ'
			},
			'Telex j applies dot tone'
		);
		assert.deepEqual(
			telex( 'aa', '' ),
			{
				noop: false,
				output: 'â'
			},
			'Telex aa applies circumflex'
		);
		assert.deepEqual(
			telex( 'ee', '' ),
			{
				noop: false,
				output: 'ê'
			},
			'Telex ee applies circumflex'
		);
		assert.deepEqual(
			telex( 'oo', '' ),
			{
				noop: false,
				output: 'ô'
			},
			'Telex oo applies circumflex'
		);
		assert.deepEqual(
			telex( 'aw', '' ),
			{
				noop: false,
				output: 'ă'
			},
			'Telex aw applies breve'
		);
		assert.deepEqual(
			telex( 'cow', '' ),
			{
				noop: false,
				output: 'cơ'
			},
			'Telex ow applies horn in a candidate'
		);
		assert.deepEqual(
			telex( 'thuw', '' ),
			{
				noop: false,
				output: 'thư'
			},
			'Telex uw applies horn in a candidate'
		);
		assert.deepEqual(
			telex( 'huaw', '' ),
			{
				noop: false,
				output: 'hưa'
			},
			'Telex w applies horn to the ua precursor before aw is read as breve'
		);
		assert.deepEqual(
			telex( 'thaya', '' ),
			{
				noop: false,
				output: 'thây'
			},
			'Telex delayed a applies circumflex before an off-glide'
		);
		assert.deepEqual(
			telex( 'thâys', '' ),
			{
				noop: false,
				output: 'thấy'
			},
			'Telex tone applies after a delayed circumflex command'
		);
		assert.deepEqual(
			telex( 'thangw', '' ),
			{
				noop: false,
				output: 'thăng'
			},
			'Telex delayed w applies breve after a coda'
		);
		assert.deepEqual(
			telex( 'hâmw', '' ),
			{
				noop: false,
				output: 'hăm'
			},
			'Telex delayed w switches circumflex a to breve'
		);
		assert.deepEqual(
			telex( 'hốpw', '' ),
			{
				noop: false,
				output: 'hớp'
			},
			'Telex w switches circumflex o to horn'
		);
		assert.deepEqual(
			telex( 'hướpo', '' ),
			{
				noop: false,
				output: 'huốp'
			},
			'Telex delayed o switches horned uo-family candidate to circumflex'
		);
		assert.deepEqual(
			telex( 'quoco', '' ),
			{
				noop: false,
				output: 'quôc'
			},
			'Telex delayed o ignores the u in qu'
		);
		assert.deepEqual(
			telex( 'gienge', '' ),
			{
				noop: false,
				output: 'giêng'
			},
			'Telex delayed e ignores the i in gi'
		);
		assert.deepEqual(
			telex( 'dd', '' ),
			{
				noop: false,
				output: 'đ'
			},
			'Telex dd applies d-stroke'
		);
		assert.deepEqual(
			telex( 'dacd', '' ),
			{
				noop: false,
				output: 'đac'
			},
			'Telex d-stroke can apply after later rime material'
		);
	} );

	QUnit.test( 'Telex adapter supports removal, repeated-key escape, and literal safeguards', ( assert ) => {
		var telex = $.ime.inputmethods[ 'vi-telex' ].patterns;

		assert.deepEqual(
			telex( 'toánz', '' ),
			{
				noop: false,
				output: 'toan'
			},
			'Telex z removes a tone'
		);
		assert.deepEqual(
			telex( 'ás', '' ),
			{
				noop: false,
				output: 'as'
			},
			'Repeating a Telex tone key escapes to literal input'
		);
		assert.deepEqual(
			telex( 'âa', '' ),
			{
				noop: false,
				output: 'aa'
			},
			'Repeating a Telex circumflex key escapes to literal input'
		);
		assert.deepEqual(
			telex( 'ưw', '' ),
			{
				noop: false,
				output: 'uw'
			},
			'Repeating a Telex horn key escapes to literal input'
		);
		assert.deepEqual(
			telex( 'thươngw', '' ),
			{
				noop: false,
				output: 'thuongw'
			},
			'Repeating Telex w after a horned uo-family candidate escapes to literal input'
		);
		assert.deepEqual(
			telex( 'đd', '' ),
			{
				noop: false,
				output: 'dd'
			},
			'Repeating a Telex d-stroke key escapes to literal input'
		);
		assert.deepEqual(
			telex( 'đácd', '' ),
			{
				noop: false,
				output: 'dácd'
			},
			'Repeating a Telex d-stroke key escapes after a full rendered candidate'
		);
		assert.deepEqual(
			telex( 'thuongw', '' ),
			{
				noop: false,
				output: 'thương'
			},
			'Telex w applies horn to an eligible candidate'
		);
		assert.deepEqual(
			telex( 'thayw', '' ),
			{
				noop: true,
				output: 'thayw'
			},
			'Telex w remains literal after an off-glide candidate'
		);
		assert.deepEqual(
			telex( 'hoao', '' ),
			{
				noop: true,
				output: 'hoao'
			},
			'Telex final o remains literal in the covered oao rime'
		);
		assert.deepEqual(
			telex( 'hoeo', '' ),
			{
				noop: true,
				output: 'hoeo'
			},
			'Telex final o remains literal in the covered oeo rime'
		);
		assert.deepEqual(
			telex( 'w', '' ),
			{
				noop: true,
				output: 'w'
			},
			'Standalone Telex w remains literal'
		);
		assert.deepEqual(
			telex( '[', '' ),
			{
				noop: true,
				output: '['
			},
			'Telex [ remains literal'
		);
		assert.deepEqual(
			telex( ']', '' ),
			{
				noop: true,
				output: ']'
			},
			'Telex ] remains literal'
		);
		assert.deepEqual(
			telex( 'ww', '' ),
			{
				noop: true,
				output: 'ww'
			},
			'Telex ww remains literal when standalone w is not a quick key'
		);
	} );

	QUnit.test( 'Telex adapter follows checked-ending tone constraints', ( assert ) => {
		var telex = $.ime.inputmethods[ 'vi-telex' ].patterns;

		assert.deepEqual(
			telex( 'mats', '' ),
			{
				noop: false,
				output: 'mát'
			},
			'Telex checked syllables accept acute tone'
		);
		assert.deepEqual(
			telex( 'matj', '' ),
			{
				noop: false,
				output: 'mạt'
			},
			'Telex checked syllables accept dot tone'
		);
		assert.deepEqual(
			telex( 'matf', '' ),
			{
				noop: true,
				output: 'matf'
			},
			'Telex checked syllables reject grave tone conservatively'
		);
		assert.deepEqual(
			telex( 'matx', '' ),
			{
				noop: true,
				output: 'matx'
			},
			'Telex checked syllables reject tilde tone conservatively'
		);
	} );

	QUnit.test( 'Telex adapter does not infer IÊ-family vowel diacritics', ( assert ) => {
		var telex = $.ime.inputmethods[ 'vi-telex' ].patterns;

		assert.deepEqual(
			telex( 'Vietj', 'et' ),
			{
				noop: false,
				output: 'Viẹt'
			},
			'Telex j applies only tone; it does not infer iê from ie'
		);
		assert.deepEqual(
			telex( 'Viêtj', 'et' ),
			{
				noop: false,
				output: 'Việt'
			},
			'Explicit Telex ee produces Việt before tone placement'
		);
	} );

	QUnit.module( 'VIWP.IME – VIQR adapter', {
		before: loadVietnameseSource
	} );

	QUnit.test( 'VIQR adapter maps tone, vowel-diacritic, and d-stroke keys', ( assert ) => {
		var viqr = $.ime.inputmethods[ 'vi-viqr' ].patterns;

		assert.deepEqual(
			viqr( 'a\'', '' ),
			{
				noop: false,
				output: 'á'
			},
			'VIQR apostrophe applies acute tone'
		);
		assert.deepEqual(
			viqr( 'a`', '' ),
			{
				noop: false,
				output: 'à'
			},
			'VIQR grave accent applies grave tone'
		);
		assert.deepEqual(
			viqr( 'a?', '' ),
			{
				noop: false,
				output: 'ả'
			},
			'VIQR question mark applies hook tone'
		);
		assert.deepEqual(
			viqr( 'a~', '' ),
			{
				noop: false,
				output: 'ã'
			},
			'VIQR tilde applies tilde tone'
		);
		assert.deepEqual(
			viqr( 'a.', '' ),
			{
				noop: false,
				output: 'ạ'
			},
			'VIQR full stop applies dot tone'
		);
		assert.deepEqual(
			viqr( 'a^', '' ),
			{
				noop: false,
				output: 'â'
			},
			'VIQR circumflex applies circumflex'
		);
		assert.deepEqual(
			viqr( 'a(', '' ),
			{
				noop: false,
				output: 'ă'
			},
			'VIQR open parenthesis applies breve'
		);
		assert.deepEqual(
			viqr( 'o+', '' ),
			{
				noop: false,
				output: 'ơ'
			},
			'VIQR plus applies horn'
		);
		assert.deepEqual(
			viqr( 'dd', '' ),
			{
				noop: false,
				output: 'đ'
			},
			'VIQR dd applies d-stroke'
		);
		assert.deepEqual(
			viqr( 'dacd', '' ),
			{
				noop: false,
				output: 'đac'
			},
			'VIQR d-stroke can apply after later rime material'
		);
	} );

	QUnit.test( 'VIQR adapter supports tone removal and escape key', ( assert ) => {
		var viqr = $.ime.inputmethods[ 'vi-viqr' ].patterns;

		assert.deepEqual(
			viqr( 'á0', '' ),
			{
				noop: false,
				output: 'a'
			},
			'VIQR 0 removes a tone'
		);
		assert.deepEqual(
			viqr( 'tan?', '' ),
			{
				noop: false,
				output: 'tản'
			},
			'VIQR question mark remains a tone key without escape'
		);
		assert.deepEqual(
			viqr( 'tan\\?', '' ),
			{
				noop: false,
				output: 'tan?'
			},
			'VIQR backslash escapes a command key'
		);
		assert.deepEqual(
			viqr( 'a\\^', '' ),
			{
				noop: false,
				output: 'a^'
			},
			'VIQR backslash escapes vowel-diacritic keys'
		);
		assert.deepEqual(
			viqr( 'đd', '' ),
			{
				noop: true,
				output: 'đd'
			},
			'VIQR delayed d-stroke does not add repeated-key escape'
		);
	} );

	QUnit.test( 'VIQR shifted patterns bridge delegates to the shared adapter', ( assert ) => {
		var viqrShift = $.ime.inputmethods[ 'vi-viqr' ].patterns_shift[ 0 ][ 1 ],
			viqrStarShift = $.ime.inputmethods[ 'vi-viqr-star' ].patterns_shift[ 0 ][ 1 ];

		assert.strictEqual(
			viqrShift( 'a?' ),
			'ả',
			'VIQR shifted question mark applies hook tone'
		);
		assert.strictEqual(
			viqrShift( 'a~' ),
			'ã',
			'VIQR shifted tilde applies tilde tone'
		);
		assert.strictEqual(
			viqrShift( 'a^' ),
			'â',
			'VIQR shifted circumflex applies circumflex'
		);
		assert.strictEqual(
			viqrShift( 'u+' ),
			'ư',
			'VIQR shifted plus applies horn'
		);
		assert.strictEqual(
			viqrShift( 'a(' ),
			'ă',
			'VIQR shifted open parenthesis applies breve'
		);
		assert.strictEqual(
			viqrShift( 'tan\\?' ),
			'tan?',
			'VIQR shifted bridge preserves backslash escape behavior'
		);
		assert.strictEqual(
			viqrStarShift( 'u*' ),
			'ư',
			'VIQR* shifted star applies horn through the same bridge'
		);
		assert.strictEqual(
			viqrStarShift( 'o\\*' ),
			'o*',
			'VIQR* shifted bridge preserves star escape behavior'
		);
	} );

	QUnit.module( 'VIWP.IME – VIQR* adapter', {
		before: loadVietnameseSource
	} );

	QUnit.test( 'VIQR* adapter uses star as the horn key', ( assert ) => {
		var viqrStar = $.ime.inputmethods[ 'vi-viqr-star' ].patterns;

		assert.deepEqual(
			viqrStar( 'o*', '' ),
			{
				noop: false,
				output: 'ơ'
			},
			'VIQR* star applies horn to o'
		);
		assert.deepEqual(
			viqrStar( 'u*', '' ),
			{
				noop: false,
				output: 'ư'
			},
			'VIQR* star applies horn to u'
		);
		assert.deepEqual(
			viqrStar( 'dacd', '' ),
			{
				noop: false,
				output: 'đac'
			},
			'VIQR* shares delayed d-stroke behavior'
		);
		assert.deepEqual(
			viqrStar( 'o+', '' ),
			{
				noop: true,
				output: 'o+'
			},
			'VIQR* leaves plus as literal input'
		);
		assert.deepEqual(
			viqrStar( 'tan\\?', '' ),
			{
				noop: false,
				output: 'tan?'
			},
			'VIQR* keeps the VIQR escape key'
		);
		assert.deepEqual(
			viqrStar( 'o\\*', '' ),
			{
				noop: false,
				output: 'o*'
			},
			'VIQR* backslash escapes star'
		);
	} );
}( jQuery ) );
