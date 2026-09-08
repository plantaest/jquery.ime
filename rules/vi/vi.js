( function ( $ ) {
	'use strict';

	var DEFAULT_CONTEXT_LENGTH = 0,
		DEFAULT_MAX_KEY_LENGTH = 16,
		Vietnamese = $.ime.vi || {},
		passThroughEngine;

	function passThrough( input ) {
		return {
			noop: true,
			output: input
		};
	}

	function decodeNoCommand() {
		return null;
	}

	/**
	 * Decode a VNI key into a shared Vietnamese semantic command.
	 *
	 * @param {string} input Text window ending with the latest typed key.
	 * @return {Object|null} Decoded command with key and command fields, or null.
	 */
	function decodeVNICommand( input ) {
		var toneCommands = {
				1: Vietnamese.Tone.ACUTE,
				2: Vietnamese.Tone.GRAVE,
				3: Vietnamese.Tone.HOOK,
				4: Vietnamese.Tone.TILDE,
				5: Vietnamese.Tone.DOT
			},
			vowelDiacriticCommands = {
				6: Vietnamese.VowelDiacritic.CIRCUMFLEX,
				7: Vietnamese.VowelDiacritic.HORN,
				8: Vietnamese.VowelDiacritic.BREVE
			},
			key = input.slice( -1 );

		if ( toneCommands[ key ] ) {
			return {
				key: key,
				command: {
					type: Vietnamese.CommandType.APPLY_TONE,
					tone: toneCommands[ key ]
				}
			};
		}

		if ( vowelDiacriticCommands[ key ] ) {
			return {
				key: key,
				command: {
					type: Vietnamese.CommandType.APPLY_VOWEL_DIACRITIC,
					vowelDiacritic: vowelDiacriticCommands[ key ]
				}
			};
		}

		if ( key === '0' ) {
			return {
				key: key,
				command: {
					type: Vietnamese.CommandType.REMOVE_TONE
				}
			};
		}

		if ( key === '9' ) {
			return {
				key: key,
				command: {
					type: Vietnamese.CommandType.APPLY_D_STROKE
				}
			};
		}

		return null;
	}

	function isCandidateCodeUnit( character ) {
		var code = character.charCodeAt( 0 );

		return code >= 0x41 && code <= 0x5A ||
			code >= 0x61 && code <= 0x7A ||
			code >= 0xC0 && code <= 0x1EF9 ||
			code >= 0x300 && code <= 0x36F;
	}

	/**
	 * Split the text before a command key into the unchanged prefix and the
	 * candidate text that may be transformed by the Vietnamese engine.
	 *
	 * @param {string} input Text window ending with the command key.
	 * @param {string} commandKey Command key recognized by the adapter.
	 * @return {Object} Object with prefix and candidate string properties.
	 */
	function extractCandidate( input, commandKey ) {
		var commandStart = input.length - commandKey.length,
			beforeCommand = input.slice( 0, commandStart ),
			candidateStart = beforeCommand.length,
			candidate;

		while (
			candidateStart > 0 &&
			isCandidateCodeUnit( beforeCommand.charAt( candidateStart - 1 ) )
		) {
			candidateStart--;
		}

		if ( candidateStart === beforeCommand.length ) {
			return {
				prefix: beforeCommand,
				candidate: ''
			};
		}

		candidate = beforeCommand.slice( candidateStart );
		return {
			prefix: beforeCommand.slice( 0, candidateStart ),
			candidate: candidate
		};
	}

	/**
	 * Create a jQuery.IME patterns function backed by a shared Vietnamese engine.
	 *
	 * @param {Object} options Adapter options.
	 * @param {Function} [options.decodeCommand] Input-method-specific command decoder.
	 * @param {Object} [options.engine] Shared Vietnamese composition engine.
	 * @param {string} options.inputMethodId Input method id passed to the engine.
	 * @return {Function} jQuery.IME patterns function.
	 */
	function createAdapter( options ) {
		var decodeCommand = options.decodeCommand || decodeNoCommand,
			engine = options.engine || passThroughEngine,
			inputMethodId = options.inputMethodId;

		return function ( input, context ) {
			var decoded = decodeCommand( input, context ),
				extracted, result;

			if ( !decoded ) {
				return passThrough( input );
			}

			extracted = extractCandidate( input, decoded.key );
			if ( !extracted.candidate ) {
				return passThrough( input );
			}

			result = engine.transformCandidate( extracted.candidate, decoded.command, {
				context: context,
				inputMethodId: inputMethodId
			} );

			if ( !result || !result.handled ) {
				return passThrough( input );
			}

			return {
				noop: false,
				output: extracted.prefix + result.output
			};
		};
	}

	/**
	 * Register a Vietnamese input method that delegates composition to the
	 * shared adapter and engine boundary.
	 *
	 * @param {string} inputMethodId Input method id registered with jQuery.IME.
	 * @param {string} name Human-readable input method name.
	 * @param {string} description Input method description.
	 * @param {Function} decodeCommand Input-method-specific command decoder.
	 */
	function registerInputMethod( inputMethodId, name, description, decodeCommand ) {
		$.ime.register( {
			id: inputMethodId,
			name: name,
			description: description,
			date: '2026-09-01',
			author: 'Plantaest',
			license: 'GPLv3',
			version: '0.1.0',
			contextLength: DEFAULT_CONTEXT_LENGTH,
			maxKeyLength: DEFAULT_MAX_KEY_LENGTH,
			patterns: createAdapter( {
				inputMethodId: inputMethodId,
				decodeCommand: decodeCommand,
				engine: passThroughEngine
			} )
		} );
	}

	Vietnamese.CommandType = Vietnamese.CommandType || {
		APPLY_TONE: 'apply-tone',
		REMOVE_TONE: 'remove-tone',
		APPLY_VOWEL_DIACRITIC: 'apply-vowel-diacritic',
		APPLY_D_STROKE: 'apply-d-stroke'
	};

	Vietnamese.Tone = Vietnamese.Tone || {
		NONE: 'none',
		ACUTE: 'acute',
		GRAVE: 'grave',
		HOOK: 'hook',
		TILDE: 'tilde',
		DOT: 'dot'
	};

	Vietnamese.VowelDiacritic = Vietnamese.VowelDiacritic || {
		NONE: 'none',
		CIRCUMFLEX: 'circumflex',
		BREVE: 'breve',
		HORN: 'horn'
		};

	passThroughEngine = Vietnamese.passThroughEngine || {
		/**
		 * Placeholder engine contract for the integration spike.
		 *
		 * @return {Object} Result object with handled false.
		 */
		transformCandidate: function () {
			return {
				handled: false
			};
		}
	};

	Vietnamese.DEFAULT_CONTEXT_LENGTH = DEFAULT_CONTEXT_LENGTH;
	Vietnamese.DEFAULT_MAX_KEY_LENGTH = DEFAULT_MAX_KEY_LENGTH;
	Vietnamese.createAdapter = createAdapter;
	Vietnamese.decodeVNICommand = decodeVNICommand;
	Vietnamese.decodeNoCommand = decodeNoCommand;
	Vietnamese.extractCandidate = extractCandidate;
	Vietnamese.passThroughEngine = passThroughEngine;

	$.ime.vi = Vietnamese;

	registerInputMethod(
		'vi-vni',
		'Vietnamese VNI',
		'Vietnamese VNI integration spike adapter',
		decodeVNICommand
	);
	registerInputMethod(
		'vi-telex',
		'Vietnamese Telex',
		'Vietnamese Telex integration spike adapter',
		decodeNoCommand
	);
	registerInputMethod(
		'vi-viqr',
		'Vietnamese VIQR',
		'Vietnamese VIQR integration spike adapter',
		decodeNoCommand
	);
}( jQuery ) );
