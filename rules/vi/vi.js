( function ( $ ) {
	'use strict';

	var DEFAULT_CONTEXT_LENGTH = 0,
		DEFAULT_MAX_KEY_LENGTH = 16,
		COMBINING_ACUTE = '\u0301',
		COMBINING_GRAVE = '\u0300',
		COMBINING_HOOK = '\u0309',
		COMBINING_TILDE = '\u0303',
		COMBINING_DOT = '\u0323',
		COMBINING_CIRCUMFLEX = '\u0302',
		COMBINING_BREVE = '\u0306',
		COMBINING_HORN = '\u031b',
		Vietnamese = $.ime.vi || {},
		toneToMark,
		markToTone,
		vowelDiacriticToMark,
		markToVowelDiacritic,
		engine;

	function normalizeText( text, form ) {
		if ( typeof text.normalize === 'function' ) {
			return text.normalize( form );
		}

		return text;
	}

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

	function isCombiningMark( character ) {
		var code = character.charCodeAt( 0 );

		return code >= 0x300 && code <= 0x36F;
	}

	function isBaseVowel( character ) {
		return 'aeiouy'.includes( character.toLowerCase() );
	}

	function isAsciiLetter( character ) {
		var code = character.charCodeAt( 0 );

		return code >= 0x41 && code <= 0x5A ||
			code >= 0x61 && code <= 0x7A;
	}

	function createToken( character ) {
		if ( character === '\u0111' ) {
			return {
				base: 'd',
				dStroke: true,
				isVowel: false,
				tone: Vietnamese.Tone.NONE,
				vowelDiacritic: Vietnamese.VowelDiacritic.NONE
			};
		}

		if ( character === '\u0110' ) {
			return {
				base: 'D',
				dStroke: true,
				isVowel: false,
				tone: Vietnamese.Tone.NONE,
				vowelDiacritic: Vietnamese.VowelDiacritic.NONE
			};
		}

		if ( isAsciiLetter( character ) ) {
			return {
				base: character,
				dStroke: false,
				isVowel: isBaseVowel( character ),
				tone: Vietnamese.Tone.NONE,
				vowelDiacritic: Vietnamese.VowelDiacritic.NONE
			};
		}

		return null;
	}

	function cloneToken( token ) {
		return {
			base: token.base,
			dStroke: token.dStroke,
			isVowel: token.isVowel,
			tone: token.tone,
			vowelDiacritic: token.vowelDiacritic
		};
	}

	function cloneState( state ) {
		return {
			status: state.status,
			tone: state.tone,
			tokens: state.tokens.map( cloneToken )
		};
	}

	function isValidVowelDiacritic( base, vowelDiacritic ) {
		var lowerBase = base.toLowerCase();

		if ( vowelDiacritic === Vietnamese.VowelDiacritic.NONE ) {
			return true;
		}

		if ( vowelDiacritic === Vietnamese.VowelDiacritic.CIRCUMFLEX ) {
			return lowerBase === 'a' || lowerBase === 'e' || lowerBase === 'o';
		}

		if ( vowelDiacritic === Vietnamese.VowelDiacritic.BREVE ) {
			return lowerBase === 'a';
		}

		if ( vowelDiacritic === Vietnamese.VowelDiacritic.HORN ) {
			return lowerBase === 'o' || lowerBase === 'u';
		}

		return false;
	}

	function addCombiningMarkToToken( token, mark, state ) {
		var tone = markToTone[ mark ],
			vowelDiacritic = markToVowelDiacritic[ mark ];

		if ( tone ) {
			if ( !token.isVowel || state.tone !== Vietnamese.Tone.NONE ) {
				return false;
			}

			token.tone = tone;
			state.tone = tone;
			return true;
		}

		if ( vowelDiacritic ) {
			if ( !token.isVowel || token.vowelDiacritic !== Vietnamese.VowelDiacritic.NONE ) {
				return false;
			}

			if ( !isValidVowelDiacritic( token.base, vowelDiacritic ) ) {
				return false;
			}

			token.vowelDiacritic = vowelDiacritic;
			return true;
		}

		return false;
	}

	function unrecognizedCandidate() {
		return {
			status: Vietnamese.StateType.UNRECOGNIZED,
			tone: Vietnamese.Tone.NONE,
			tokens: []
		};
	}

	/**
	 * Parse rendered candidate text into a minimal Vietnamese composition state.
	 *
	 * @param {string} candidate Candidate text near the caret.
	 * @return {Object} Composition state.
	 */
	function parseCandidate( candidate ) {
		var i, character, token,
			hasVowel = false,
			normalizedCandidate = normalizeText( candidate, 'NFD' ),
			state = {
				status: Vietnamese.StateType.STRUCTURALLY_VALID,
				tone: Vietnamese.Tone.NONE,
				tokens: []
			};

		if ( !normalizedCandidate ) {
			return unrecognizedCandidate();
		}

		for ( i = 0; i < normalizedCandidate.length; i++ ) {
			character = normalizedCandidate.charAt( i );

			if ( isCombiningMark( character ) ) {
				if (
					state.tokens.length === 0 ||
					!addCombiningMarkToToken( state.tokens[ state.tokens.length - 1 ], character, state )
				) {
					return unrecognizedCandidate();
				}

				continue;
			}

			token = createToken( character );
			if ( !token ) {
				return unrecognizedCandidate();
			}

			if ( token.isVowel ) {
				hasVowel = true;
			}

			state.tokens.push( token );
		}

		if ( !hasVowel ) {
			state.status = Vietnamese.StateType.INTERMEDIATE;
		}

		return state;
	}

	function renderToken( token, tone ) {
		var output;

		if ( token.dStroke ) {
			return token.base === 'D' ? '\u0110' : '\u0111';
		}

		output = token.base;
		if ( token.vowelDiacritic !== Vietnamese.VowelDiacritic.NONE ) {
			output += vowelDiacriticToMark[ token.vowelDiacritic ];
		}

		if ( tone && tone !== Vietnamese.Tone.NONE ) {
			output += toneToMark[ tone ];
		}

		return normalizeText( output, 'NFC' );
	}

	function getVowelIdentity( token ) {
		return renderToken( {
			base: token.base.toLowerCase(),
			dStroke: false,
			isVowel: token.isVowel,
			tone: Vietnamese.Tone.NONE,
			vowelDiacritic: token.vowelDiacritic
		}, Vietnamese.Tone.NONE );
	}

	function collectVowels( state ) {
		var i, token,
			identities = [],
			indices = [];

		for ( i = 0; i < state.tokens.length; i++ ) {
			token = state.tokens[ i ];
			if ( token.isVowel ) {
				identities.push( getVowelIdentity( token ) );
				indices.push( i );
			}
		}

		return {
			identities: identities,
			indices: indices
		};
	}

	function findLastVowelPattern( vowels, pattern, targetOffset ) {
		var patternIndex,
			vowelText = vowels.identities.join( '' );

		patternIndex = vowelText.lastIndexOf( pattern );
		if ( patternIndex === -1 ) {
			return -1;
		}

		return vowels.indices[ patternIndex + targetOffset ];
	}

	function resolveNaturalToneTarget( state, vowels ) {
		var i, target,
			patterns = [
				{ text: '\u01b0\u01a1', offset: 1 },
				{ text: 'u\u00f4', offset: 1 },
				{ text: 'i\u00ea', offset: 1 },
				{ text: 'y\u00ea', offset: 1 },
				{ text: '\u01b0a', offset: 0 },
				{ text: 'ua', offset: 0 },
				{ text: 'ia', offset: 0 },
				{ text: 'ya', offset: 0 }
			];

		for ( i = 0; i < patterns.length; i++ ) {
			target = findLastVowelPattern( vowels, patterns[ i ].text, patterns[ i ].offset );
			if ( target !== -1 ) {
				return target;
			}
		}

		return vowels.indices[ vowels.indices.length - 1 ];
	}

	function resolveTraditionalOpenMedialTarget( state, vowels ) {
		var firstIndex, secondIndex, suffix,
			vowelCount = vowels.identities.length;

		if ( vowelCount < 2 ) {
			return -1;
		}

		firstIndex = vowels.indices[ vowelCount - 2 ];
		secondIndex = vowels.indices[ vowelCount - 1 ];
		suffix = vowels.identities[ vowelCount - 2 ] + vowels.identities[ vowelCount - 1 ];

		if (
			secondIndex === state.tokens.length - 1 &&
			( suffix === 'oa' || suffix === 'oe' || suffix === 'uy' )
		) {
			return firstIndex;
		}

		return -1;
	}

	/**
	 * Resolve the token index that should carry the visible tone mark.
	 *
	 * @param {Object} state Composition state.
	 * @return {number} Token index, or -1 if there is no vowel target.
	 */
	function resolveTonePlacement( state ) {
		var traditionalTarget,
			vowels = collectVowels( state );

		if ( vowels.indices.length === 0 ) {
			return -1;
		}

		if ( vowels.indices.length === 1 ) {
			return vowels.indices[ 0 ];
		}

		traditionalTarget = resolveTraditionalOpenMedialTarget( state, vowels );
		if ( traditionalTarget !== -1 ) {
			return traditionalTarget;
		}

		return resolveNaturalToneTarget( state, vowels );
	}

	/**
	 * Render a Vietnamese composition state to normalized output text.
	 *
	 * @param {Object} state Composition state.
	 * @return {string} NFC output.
	 */
	function renderCandidate( state ) {
		var i,
			output = '',
			toneTarget = resolveTonePlacement( state );

		for ( i = 0; i < state.tokens.length; i++ ) {
			output += renderToken(
				state.tokens[ i ],
				i === toneTarget ? state.tone : Vietnamese.Tone.NONE
			);
		}

		return normalizeText( output, 'NFC' );
	}

	function applyTone( state, tone ) {
		var nextState;

		if ( state.tone === tone || resolveTonePlacement( state ) === -1 ) {
			return null;
		}

		nextState = cloneState( state );
		nextState.tone = tone;
		return nextState;
	}

	function removeTone( state ) {
		var nextState;

		if ( state.tone === Vietnamese.Tone.NONE ) {
			return null;
		}

		nextState = cloneState( state );
		nextState.tone = Vietnamese.Tone.NONE;
		return nextState;
	}

	function applySimpleVowelDiacritic( state, vowelDiacritic ) {
		var i, token, nextState;

		for ( i = state.tokens.length - 1; i >= 0; i-- ) {
			token = state.tokens[ i ];
			if (
				token.isVowel &&
				token.vowelDiacritic === Vietnamese.VowelDiacritic.NONE &&
				isValidVowelDiacritic( token.base, vowelDiacritic )
			) {
				nextState = cloneState( state );
				nextState.tokens[ i ].vowelDiacritic = vowelDiacritic;
				return nextState;
			}
		}

		return null;
	}

	function applyHornToUo( state ) {
		var i, firstToken, secondToken, nextState;

		for ( i = state.tokens.length - 2; i >= 0; i-- ) {
			firstToken = state.tokens[ i ];
			secondToken = state.tokens[ i + 1 ];

			if (
				firstToken.isVowel &&
				secondToken.isVowel &&
				firstToken.base.toLowerCase() === 'u' &&
				secondToken.base.toLowerCase() === 'o' &&
				firstToken.vowelDiacritic === Vietnamese.VowelDiacritic.NONE &&
				secondToken.vowelDiacritic === Vietnamese.VowelDiacritic.NONE
			) {
				nextState = cloneState( state );
				nextState.tokens[ i ].vowelDiacritic = Vietnamese.VowelDiacritic.HORN;
				nextState.tokens[ i + 1 ].vowelDiacritic = Vietnamese.VowelDiacritic.HORN;
				return nextState;
			}
		}

		return null;
	}

	function applyVowelDiacritic( state, vowelDiacritic ) {
		if ( vowelDiacritic === Vietnamese.VowelDiacritic.HORN ) {
			return applyHornToUo( state ) ||
				applySimpleVowelDiacritic( state, vowelDiacritic );
		}

		return applySimpleVowelDiacritic( state, vowelDiacritic );
	}

	function applyDStroke( state ) {
		var nextState,
			token = state.tokens[ 0 ];

		if (
			state.tokens.length !== 1 ||
			!token ||
			token.dStroke ||
			( token.base !== 'd' && token.base !== 'D' )
		) {
			return null;
		}

		nextState = cloneState( state );
		nextState.tokens[ 0 ].dStroke = true;
		return nextState;
	}

	function transformState( state, command ) {
		if ( state.status === Vietnamese.StateType.UNRECOGNIZED ) {
			return null;
		}

		if ( command.type === Vietnamese.CommandType.APPLY_TONE ) {
			return applyTone( state, command.tone );
		}

		if ( command.type === Vietnamese.CommandType.REMOVE_TONE ) {
			return removeTone( state );
		}

		if ( command.type === Vietnamese.CommandType.APPLY_VOWEL_DIACRITIC ) {
			return applyVowelDiacritic( state, command.vowelDiacritic );
		}

		if ( command.type === Vietnamese.CommandType.APPLY_D_STROKE ) {
			return applyDStroke( state );
		}

		return null;
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
			adapterEngine = options.engine || engine,
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

			result = adapterEngine.transformCandidate( extracted.candidate, decoded.command, {
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
			version: '0.2.0',
			contextLength: DEFAULT_CONTEXT_LENGTH,
			maxKeyLength: DEFAULT_MAX_KEY_LENGTH,
			patterns: createAdapter( {
				inputMethodId: inputMethodId,
				decodeCommand: decodeCommand,
				engine: engine
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

	Vietnamese.StateType = Vietnamese.StateType || {
		UNRECOGNIZED: 'unrecognized',
		INTERMEDIATE: 'intermediate',
		STRUCTURALLY_VALID: 'structurally-valid'
	};

	toneToMark = {};
	toneToMark[ Vietnamese.Tone.ACUTE ] = COMBINING_ACUTE;
	toneToMark[ Vietnamese.Tone.GRAVE ] = COMBINING_GRAVE;
	toneToMark[ Vietnamese.Tone.HOOK ] = COMBINING_HOOK;
	toneToMark[ Vietnamese.Tone.TILDE ] = COMBINING_TILDE;
	toneToMark[ Vietnamese.Tone.DOT ] = COMBINING_DOT;

	markToTone = {};
	markToTone[ COMBINING_ACUTE ] = Vietnamese.Tone.ACUTE;
	markToTone[ COMBINING_GRAVE ] = Vietnamese.Tone.GRAVE;
	markToTone[ COMBINING_HOOK ] = Vietnamese.Tone.HOOK;
	markToTone[ COMBINING_TILDE ] = Vietnamese.Tone.TILDE;
	markToTone[ COMBINING_DOT ] = Vietnamese.Tone.DOT;

	vowelDiacriticToMark = {};
	vowelDiacriticToMark[ Vietnamese.VowelDiacritic.CIRCUMFLEX ] = COMBINING_CIRCUMFLEX;
	vowelDiacriticToMark[ Vietnamese.VowelDiacritic.BREVE ] = COMBINING_BREVE;
	vowelDiacriticToMark[ Vietnamese.VowelDiacritic.HORN ] = COMBINING_HORN;

	markToVowelDiacritic = {};
	markToVowelDiacritic[ COMBINING_CIRCUMFLEX ] = Vietnamese.VowelDiacritic.CIRCUMFLEX;
	markToVowelDiacritic[ COMBINING_BREVE ] = Vietnamese.VowelDiacritic.BREVE;
	markToVowelDiacritic[ COMBINING_HORN ] = Vietnamese.VowelDiacritic.HORN;

	engine = Vietnamese.engine || {
		/**
		 * Transform a rendered candidate with a semantic Vietnamese command.
		 *
		 * @param {string} candidate Candidate text near the caret.
		 * @param {Object} command Shared semantic command.
		 * @return {Object} Result object with handled and output fields.
		 */
		transformCandidate: function ( candidate, command ) {
			var nextState,
				state = parseCandidate( candidate );

			nextState = transformState( state, command );
			if ( !nextState ) {
				return {
					handled: false
				};
			}

			return {
				handled: true,
				output: renderCandidate( nextState )
			};
		}
	};

	Vietnamese.DEFAULT_CONTEXT_LENGTH = DEFAULT_CONTEXT_LENGTH;
	Vietnamese.DEFAULT_MAX_KEY_LENGTH = DEFAULT_MAX_KEY_LENGTH;
	Vietnamese.createAdapter = createAdapter;
	Vietnamese.decodeVNICommand = decodeVNICommand;
	Vietnamese.decodeNoCommand = decodeNoCommand;
	Vietnamese.extractCandidate = extractCandidate;
	Vietnamese.parseCandidate = parseCandidate;
	Vietnamese.renderCandidate = renderCandidate;
	Vietnamese.resolveTonePlacement = resolveTonePlacement;
	Vietnamese.engine = engine;

	$.ime.vi = Vietnamese;

	registerInputMethod(
		'vi-vni',
		'Vietnamese VNI',
		'Vietnamese VNI input method',
		decodeVNICommand
	);
	registerInputMethod(
		'vi-telex',
		'Vietnamese Telex',
		'Vietnamese Telex integration scaffold',
		decodeNoCommand
	);
	registerInputMethod(
		'vi-viqr',
		'Vietnamese VIQR',
		'Vietnamese VIQR integration scaffold',
		decodeNoCommand
	);
}( jQuery ) );
