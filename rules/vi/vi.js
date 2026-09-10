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

	function createToneCommand( key, tone ) {
		return {
			key: key,
			command: {
				type: Vietnamese.CommandType.APPLY_TONE,
				literal: key,
				tone: tone
			}
		};
	}

	function createRemoveToneCommand( key ) {
		return {
			key: key,
			command: {
				type: Vietnamese.CommandType.REMOVE_TONE,
				literal: key
			}
		};
	}

	function createVowelDiacriticCommand( key, vowelDiacritic ) {
		return {
			key: key,
			command: {
				type: Vietnamese.CommandType.APPLY_VOWEL_DIACRITIC,
				literal: key,
				vowelDiacritic: vowelDiacritic
			}
		};
	}

	function createDStrokeCommand( key ) {
		return {
			key: key,
			command: {
				type: Vietnamese.CommandType.APPLY_D_STROKE,
				literal: key
			}
		};
	}

	function createOneWayDStrokeCommand( key ) {
		return {
			key: key,
			command: {
				type: Vietnamese.CommandType.APPLY_D_STROKE
			}
		};
	}

	function createLiteralOutputCommand( key, literalOutput ) {
		return {
			key: key,
			literalOutput: literalOutput
		};
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
			return createToneCommand( key, toneCommands[ key ] );
		}

		if ( vowelDiacriticCommands[ key ] ) {
			return createVowelDiacriticCommand( key, vowelDiacriticCommands[ key ] );
		}

		if ( key === '0' ) {
			return createRemoveToneCommand( key );
		}

		if ( key === '9' ) {
			return createDStrokeCommand( key );
		}

		return null;
	}

	/**
	 * Decode a Telex key sequence into a shared Vietnamese semantic command.
	 *
	 * @param {string} input Text window ending with the latest typed key.
	 * @param {string} context Raw jQuery.IME key context.
	 * @param {Object} [options] Adapter options.
	 * @param {string} [options.tonePlacement] Tone-placement policy.
	 * @return {Object|null} Decoded command with key and command fields, or null.
	 */
	function decodeTelexCommand( input, context, options ) {
		var toneCommands = {
				s: Vietnamese.Tone.ACUTE,
				f: Vietnamese.Tone.GRAVE,
				r: Vietnamese.Tone.HOOK,
				x: Vietnamese.Tone.TILDE,
				j: Vietnamese.Tone.DOT
			},
			vowelDiacriticCommands = {
				aa: Vietnamese.VowelDiacritic.CIRCUMFLEX,
				ee: Vietnamese.VowelDiacritic.CIRCUMFLEX,
				oo: Vietnamese.VowelDiacritic.CIRCUMFLEX,
				aw: Vietnamese.VowelDiacritic.BREVE,
				ow: Vietnamese.VowelDiacritic.HORN,
				uw: Vietnamese.VowelDiacritic.HORN
			},
			delayedVowelDiacriticCommands = {
				a: {
					bases: [ 'a' ],
					vowelDiacritic: Vietnamese.VowelDiacritic.CIRCUMFLEX
				},
				e: {
					bases: [ 'e' ],
					vowelDiacritic: Vietnamese.VowelDiacritic.CIRCUMFLEX
				},
				o: {
					bases: [ 'o' ],
					vowelDiacritic: Vietnamese.VowelDiacritic.CIRCUMFLEX
				},
				w: {
					bases: [ 'a' ],
					excludeOffGlideEnding: true,
					vowelDiacritic: Vietnamese.VowelDiacritic.BREVE
				}
			},
			lowerInput = input.toLowerCase(),
			key = input.slice( -1 ),
			lowerKey = key.toLowerCase(),
			tonePlacement = options && options.tonePlacement,
			vowelDiacriticCommand = vowelDiacriticCommands[ lowerInput.slice( -2 ) ],
			delayedCommand = delayedVowelDiacriticCommands[ lowerKey ],
			delayedOptions;

		if ( toneCommands[ lowerKey ] ) {
			return createToneCommand( key, toneCommands[ lowerKey ] );
		}

		if ( lowerKey === 'z' ) {
			return createRemoveToneCommand( key );
		}

		if ( lowerInput.slice( -2 ) === 'dd' ) {
			return createDStrokeCommand( key );
		}

		if ( lowerKey === 'w' && candidateCanReceiveHornUaFamily( input, key ) ) {
			return createVowelDiacriticCommand( key, Vietnamese.VowelDiacritic.HORN );
		}

		if ( vowelDiacriticCommand ) {
			return createVowelDiacriticCommand( key, vowelDiacriticCommand );
		}

		if ( lowerKey === 'd' ) {
			return createDStrokeCommand( key );
		}

		if ( lowerKey === 'o' && candidateHasProtectedLiteralRime( input ) ) {
			return null;
		}

		if ( delayedCommand ) {
			delayedOptions = {
				excludeOffGlideEnding: delayedCommand.excludeOffGlideEnding,
				tonePlacement: tonePlacement
			};
		}

		if ( delayedCommand && (
			candidateHasTargetVowelDiacritic(
				input,
				key,
				delayedCommand.vowelDiacritic,
				delayedCommand.bases,
				tonePlacement
			) ||
			candidateCanReceiveTargetVowelDiacritic(
				input,
				key,
				delayedCommand.vowelDiacritic,
				delayedCommand.bases,
				delayedOptions
			)
		) ) {
			return createVowelDiacriticCommand( key, delayedCommand.vowelDiacritic );
		}

		if ( lowerKey === 'w' ) {
			return createVowelDiacriticCommand( key, Vietnamese.VowelDiacritic.HORN );
		}

		return null;
	}

	/**
	 * Check whether the latest VIQR command key is escaped by a backslash.
	 *
	 * @param {string} input Text window ending with the latest typed key.
	 * @param {string} hornKey VIQR horn key, either `+` or `*`.
	 * @return {boolean} True if the latest command key should be literal.
	 */
	function isVIQREscapedCommand( input, hornKey ) {
		var key = input.slice( -1 ),
			previousKey = input.slice( -2, -1 ),
			commandKeys = {
				'\'': true,
				'`': true,
				'?': true,
				'~': true,
				'.': true,
				'^': true,
				'(': true,
				0: true
			};

		commandKeys[ hornKey ] = true;
		return previousKey === '\\' && commandKeys[ key ];
	}

	/**
	 * Decode a VIQR-family key using the provided horn key.
	 *
	 * @param {string} input Text window ending with the latest typed key.
	 * @param {string} hornKey VIQR horn key, either `+` or `*`.
	 * @return {Object|null} Decoded command with key and command fields, or null.
	 */
	function decodeVIQRCommandWithHornKey( input, hornKey ) {
		var toneCommands = {
				'\'': Vietnamese.Tone.ACUTE,
				'`': Vietnamese.Tone.GRAVE,
				'?': Vietnamese.Tone.HOOK,
				'~': Vietnamese.Tone.TILDE,
				'.': Vietnamese.Tone.DOT
			},
			lowerInput = input.toLowerCase(),
			key = input.slice( -1 );

		if ( isVIQREscapedCommand( input, hornKey ) ) {
			return createLiteralOutputCommand( input.slice( -2 ), key );
		}

		if ( lowerInput.slice( -2 ) === 'dd' ) {
			return createDStrokeCommand( key );
		}

		if ( key === 'd' || key === 'D' ) {
			return createOneWayDStrokeCommand( key );
		}

		if ( toneCommands[ key ] ) {
			return createToneCommand( key, toneCommands[ key ] );
		}

		if ( key === '0' ) {
			return createRemoveToneCommand( key );
		}

		if ( key === '^' ) {
			return createVowelDiacriticCommand( key, Vietnamese.VowelDiacritic.CIRCUMFLEX );
		}

		if ( key === '(' ) {
			return createVowelDiacriticCommand( key, Vietnamese.VowelDiacritic.BREVE );
		}

		if ( key === hornKey ) {
			return createVowelDiacriticCommand( key, Vietnamese.VowelDiacritic.HORN );
		}

		return null;
	}

	/**
	 * Decode a VIQR key into a shared Vietnamese semantic command.
	 *
	 * @param {string} input Text window ending with the latest typed key.
	 * @return {Object|null} Decoded command with key and command fields, or null.
	 */
	function decodeVIQRCommand( input ) {
		return decodeVIQRCommandWithHornKey( input, '+' );
	}

	/**
	 * Decode a VIQR* key into a shared Vietnamese semantic command.
	 *
	 * @param {string} input Text window ending with the latest typed key.
	 * @return {Object|null} Decoded command with key and command fields, or null.
	 */
	function decodeVIQRStarCommand( input ) {
		return decodeVIQRCommandWithHornKey( input, '*' );
	}

	/**
	 * Normalize an optional tone-placement policy.
	 *
	 * @param {string} [tonePlacement] Tone-placement policy.
	 * @return {string} Tone-placement policy.
	 */
	function normalizeTonePlacement( tonePlacement ) {
		return tonePlacement || Vietnamese.TonePlacement.TRADITIONAL;
	}

	/**
	 * Parse the rendered candidate before a command key.
	 *
	 * @param {string} input Text window ending with the command key.
	 * @param {string} commandKey Command key recognized by the adapter.
	 * @param {string} [tonePlacement] Tone-placement policy.
	 * @return {Object|null} Parsed candidate state, or null when empty.
	 */
	function parseExtractedCandidate( input, commandKey, tonePlacement ) {
		var extracted = extractCandidate( input, commandKey );

		if ( !extracted.candidate ) {
			return null;
		}

		return parseCandidate( extracted.candidate, tonePlacement );
	}

	/**
	 * Check whether a rendered candidate already has the requested vowel diacritic.
	 *
	 * Used by Telex repeated-key escape, where the raw key history has already
	 * been replaced by rendered Vietnamese text.
	 *
	 * @param {string} input Text window ending with the command key.
	 * @param {string} commandKey Command key recognized by the adapter.
	 * @param {string} vowelDiacritic Expected vowel-diacritic enum value.
	 * @param {string[]} bases Base vowel letters that may repeat this command.
	 * @param {string} [tonePlacement] Tone-placement policy.
	 * @return {boolean} True if the command should escape a rendered diacritic.
	 */
	function candidateHasTargetVowelDiacritic( input, commandKey, vowelDiacritic, bases, tonePlacement ) {
		var state = parseExtractedCandidate( input, commandKey, tonePlacement ),
			target, token;

		if ( !state || state.status === Vietnamese.StateType.UNRECOGNIZED ) {
			return false;
		}

		target = resolveTonePlacement( state );
		if ( target === -1 ) {
			return false;
		}

		token = state.tokens[ target ];
		return token.vowelDiacritic === vowelDiacritic &&
			bases.includes( token.base.toLowerCase() );
	}

	/**
	 * Check whether a rendered candidate can receive the requested diacritic.
	 *
	 * @param {string} input Text window ending with the command key.
	 * @param {string} commandKey Command key recognized by the adapter.
	 * @param {string} vowelDiacritic Expected vowel-diacritic enum value.
	 * @param {string[]} bases Base vowel letters that may receive this command.
	 * @param {Object} [options] Extra constraints for input-method-specific commands.
	 * @return {boolean} True if the command can apply to the candidate.
	 */
	function candidateCanReceiveTargetVowelDiacritic(
		input, commandKey, vowelDiacritic, bases, options
	) {
		var tonePlacement = options && options.tonePlacement,
			state = parseExtractedCandidate( input, commandKey, tonePlacement ),
			target, token;

		if ( !state || state.status === Vietnamese.StateType.UNRECOGNIZED ) {
			return false;
		}

		if (
			options &&
			options.excludeOffGlideEnding &&
			state.structure &&
			'i y o u'.split( ' ' ).includes( state.structure.ending )
		) {
			return false;
		}

		target = resolveVowelDiacriticTarget( state, vowelDiacritic );
		if ( target === -1 ) {
			return canSwitchSameBaseVowelDiacritic( state, vowelDiacritic, bases ) ||
				vowelDiacritic === Vietnamese.VowelDiacritic.CIRCUMFLEX &&
				bases.includes( 'o' ) &&
				findUoFamilyPair(
					state,
					Vietnamese.VowelDiacritic.HORN,
					Vietnamese.VowelDiacritic.HORN
				) !== -1;
		}

		token = state.tokens[ target ];
		return bases.includes( token.base.toLowerCase() );
	}

	function canSwitchSameBaseVowelDiacritic( state, vowelDiacritic, bases ) {
		var target = resolveTonePlacement( state ),
			token;

		if ( target === -1 ) {
			return false;
		}

		token = state.tokens[ target ];
		if ( !bases.includes( token.base.toLowerCase() ) ) {
			return false;
		}

		return canSwitchTokenVowelDiacritic( token, vowelDiacritic );
	}

	function candidateCanReceiveHornUaFamily( input, commandKey ) {
		var state = parseExtractedCandidate( input, commandKey );

		return !!(
			state &&
			state.status !== Vietnamese.StateType.UNRECOGNIZED &&
			findHornUaPair( state ) !== -1
		);
	}

	function candidateHasProtectedLiteralRime( input ) {
		var extracted = extractCandidate( input, '' ),
			state;

		if ( !extracted.candidate ) {
			return false;
		}

		state = parseCandidate( extracted.candidate );
		return state.status !== Vietnamese.StateType.UNRECOGNIZED &&
			state.structure &&
			isProtectedLiteralRime( state.structure.rime );
	}

	function isProtectedLiteralRime( rime ) {
		return rime === 'oao' || rime === 'oeo';
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

	function resultFromState( state, literalSuffix, tonePlacement ) {
		return {
			state: prepareState( state, tonePlacement ),
			literalSuffix: literalSuffix || ''
		};
	}

	function getTokenIdentity( token ) {
		if ( token.dStroke ) {
			return token.base === 'D' ? '\u0110' : '\u0111';
		}

		if ( token.isVowel ) {
			return getVowelIdentity( token );
		}

		return token.base;
	}

	function getLowerText( state ) {
		var i,
			output = '';

		for ( i = 0; i < state.tokens.length; i++ ) {
			output += getTokenIdentity( state.tokens[ i ] ).toLowerCase();
		}

		return output;
	}

	function hasVowelFromIndex( state, startIndex ) {
		var i;

		for ( i = startIndex; i < state.tokens.length; i++ ) {
			if ( state.tokens[ i ].isVowel ) {
				return true;
			}
		}

		return false;
	}

	function getOnsets() {
		return [
			'ngh',
			'ch',
			'gh',
			'kh',
			'ng',
			'nh',
			'ph',
			'th',
			'tr',
			'qu',
			'b',
			'c',
			'd',
			'\u0111',
			'g',
			'h',
			'k',
			'l',
			'm',
			'n',
			'p',
			'r',
			's',
			't',
			'v',
			'x'
		];
	}

	function isOnsetPrefix( lowerText ) {
		var i,
			onsets = getOnsets();

		for ( i = 0; i < onsets.length; i++ ) {
			if ( onsets[ i ].indexOf( lowerText ) === 0 ) {
				return true;
			}
		}

		return false;
	}

	function resolveOnset( state, lowerText ) {
		var i,
			onsets = getOnsets();

		if ( lowerText.indexOf( 'qu' ) === 0 ) {
			return {
				end: 2,
				ignoredVowelIndices: { 1: true },
				text: 'qu'
			};
		}

		if ( lowerText.indexOf( 'gi' ) === 0 && hasVowelFromIndex( state, 2 ) ) {
			return {
				end: 2,
				ignoredVowelIndices: { 1: true },
				text: 'gi'
			};
		}

		for ( i = 0; i < onsets.length; i++ ) {
			if ( lowerText.indexOf( onsets[ i ] ) === 0 ) {
				return {
					end: onsets[ i ].length,
					ignoredVowelIndices: {},
					text: onsets[ i ]
				};
			}
		}

		return {
			end: 0,
			ignoredVowelIndices: {},
			text: ''
		};
	}

	function collectEligibleVowels( state, ignoredVowelIndices ) {
		var i,
			identities = [],
			indices = [];

		for ( i = 0; i < state.tokens.length; i++ ) {
			if ( state.tokens[ i ].isVowel && !ignoredVowelIndices[ i ] ) {
				identities.push( getVowelIdentity( state.tokens[ i ] ) );
				indices.push( i );
			}
		}

		return {
			identities: identities,
			indices: indices
		};
	}

	function findEnding( rimeText ) {
		if ( rimeText.length > 2 && rimeText.slice( -2 ) === 'ch' ) {
			return 'ch';
		}

		if ( rimeText.length > 2 && rimeText.slice( -2 ) === 'ng' ) {
			return 'ng';
		}

		if ( rimeText.length > 2 && rimeText.slice( -2 ) === 'nh' ) {
			return 'nh';
		}

		if ( rimeText.length > 1 && 'm n p t c'.split( ' ' ).includes( rimeText.slice( -1 ) ) ) {
			return rimeText.slice( -1 );
		}

		if ( rimeText.length > 1 && 'iyou'.includes( rimeText.slice( -1 ) ) ) {
			return rimeText.slice( -1 );
		}

		return '';
	}

	function isCheckedEnding( ending ) {
		return ending === 'c' || ending === 'ch' || ending === 'p' || ending === 't';
	}

	function isConsonantalEnding( ending ) {
		return 'm n ng nh p t c ch'.split( ' ' ).includes( ending );
	}

	function findRimePatternToneTarget( structure ) {
		var i, pattern,
			patterns = [
				{ text: 'uy\u00ea', offset: 2, prefix: true },
				{ text: 'uye', offset: 2, prefix: true },
				{ text: 'uya', offset: 1 },
				{ text: 'i\u00ea', offset: 1, prefix: true },
				{ text: 'y\u00ea', offset: 1, prefix: true },
				{ text: 'u\u00f4', offset: 1, prefix: true },
				{ text: '\u01b0\u01a1', offset: 1, prefix: true },
				{ text: 'u\u00e2', offset: 1, prefix: true },
				{ text: 'u\u0103', offset: 1, prefix: true },
				{ text: 'ie', offset: 1, prefix: true },
				{ text: 'ye', offset: 1, prefix: true },
				{ text: 'uo', offset: 1, prefix: true },
				{ text: '\u01b0a', offset: 0 },
				{ text: 'ua', offset: 0 },
				{ text: 'ia', offset: 0 },
				{ text: 'ya', offset: 0 }
			];

		for ( i = 0; i < patterns.length; i++ ) {
			pattern = patterns[ i ];
			if (
				( pattern.prefix && structure.rime.indexOf( pattern.text ) === 0 ) ||
				structure.rime === pattern.text
			) {
				return structure.rimeStart + pattern.offset;
			}
		}

		return -1;
	}

	function findOffGlideToneTarget( state, vowels ) {
		var lastIndex, previousIndex, lastIdentity;

		if ( vowels.indices.length < 2 ) {
			return -1;
		}

		lastIndex = vowels.indices[ vowels.indices.length - 1 ];
		previousIndex = vowels.indices[ vowels.indices.length - 2 ];
		lastIdentity = vowels.identities[ vowels.identities.length - 1 ];

		if (
			lastIndex === state.tokens.length - 1 &&
			'i y o u'.split( ' ' ).includes( lastIdentity )
		) {
			return previousIndex;
		}

		return -1;
	}

	function isOpenMedialRime( structure ) {
		return structure.rime === 'oa' || structure.rime === 'oe' || structure.rime === 'uy';
	}

	function findOpenMedialToneTarget( structure, tonePlacement ) {
		var vowels = structure.vowels;

		if ( !isOpenMedialRime( structure ) ) {
			return -1;
		}

		if ( normalizeTonePlacement( tonePlacement ) === Vietnamese.TonePlacement.REFORMED ) {
			return vowels.indices[ vowels.indices.length - 1 ];
		}

		return vowels.indices[ 0 ];
	}

	function findToneTarget( state, structure, tonePlacement ) {
		var patternTarget, offGlideTarget,
			vowels = structure.vowels;

		if ( vowels.indices.length === 0 ) {
			return -1;
		}

		if ( vowels.indices.length === 1 ) {
			return vowels.indices[ 0 ];
		}

		patternTarget = findOpenMedialToneTarget( structure, tonePlacement );
		if ( patternTarget !== -1 ) {
			return patternTarget;
		}

		patternTarget = findRimePatternToneTarget( structure );
		if ( patternTarget !== -1 ) {
			return patternTarget;
		}

		offGlideTarget = findOffGlideToneTarget( state, vowels );
		if ( offGlideTarget !== -1 ) {
			return offGlideTarget;
		}

		return vowels.indices[ vowels.indices.length - 1 ];
	}

	function analyzeStructure( state, tonePlacement ) {
		var lowerText = getLowerText( state ),
			onset = resolveOnset( state, lowerText ),
			vowels = collectEligibleVowels( state, onset.ignoredVowelIndices ),
			rimeText = lowerText.slice( onset.end ),
			ending = findEnding( rimeText ),
			structure = {
				checked: false,
				ending: ending,
				ignoredVowelIndices: onset.ignoredVowelIndices,
				onset: onset.text,
				rime: rimeText,
				rimeStart: onset.end,
				toneTargetIndex: -1,
				vowels: vowels
		};

		structure.checked = isCheckedEnding( ending );
		structure.toneTargetIndex = findToneTarget( state, structure, tonePlacement );
		return structure;
	}

	function hasOnlyVowelsBetween( state, startIndex, endIndex ) {
		var i;

		for ( i = startIndex; i <= endIndex; i++ ) {
			if ( !state.tokens[ i ].isVowel ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Classify a candidate by its written structure, without lexical lookup.
	 *
	 * This keeps Telex command keys literal once a Latin run can no longer be
	 * one Vietnamese orthographic syllable in the current model.
	 *
	 * @param {Object} state Composition state with analyzed structure.
	 * @return {string} StateType value.
	 */
	function classifyStructure( state ) {
		var firstVowelIndex,
			lastVowelIndex,
			vowels = state.structure.vowels.indices,
			lowerText = getLowerText( state ),
			suffix;

		if ( vowels.length === 0 ) {
			return isOnsetPrefix( lowerText ) ?
				Vietnamese.StateType.INTERMEDIATE :
				Vietnamese.StateType.UNRECOGNIZED;
		}

		firstVowelIndex = vowels[ 0 ];
		lastVowelIndex = vowels[ vowels.length - 1 ];
		if (
			firstVowelIndex !== state.structure.rimeStart ||
			!hasOnlyVowelsBetween( state, firstVowelIndex, lastVowelIndex )
		) {
			return Vietnamese.StateType.UNRECOGNIZED;
		}

		suffix = lowerText.slice( lastVowelIndex + 1 );
		if ( suffix && !isConsonantalEnding( suffix ) ) {
			return Vietnamese.StateType.UNRECOGNIZED;
		}

		return Vietnamese.StateType.STRUCTURALLY_VALID;
	}

	function prepareState( state, tonePlacement ) {
		state.structure = analyzeStructure( state, tonePlacement );
		state.status = classifyStructure( state );
		return state;
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
			structure: null,
			status: Vietnamese.StateType.UNRECOGNIZED,
			tone: Vietnamese.Tone.NONE,
			tokens: []
		};
	}

	/**
	 * Parse rendered candidate text into a minimal Vietnamese composition state.
	 *
	 * @param {string} candidate Candidate text near the caret.
	 * @param {string} [tonePlacement] Tone-placement policy.
	 * @return {Object} Composition state.
	 */
	function parseCandidate( candidate, tonePlacement ) {
		var i, character, token,
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

			state.tokens.push( token );
		}

		return prepareState( state, tonePlacement );
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

	/**
	 * Resolve the token index that should carry the visible tone mark.
	 *
	 * @param {Object} state Composition state.
	 * @param {string} [tonePlacement] Tone-placement policy.
	 * @return {number} Token index, or -1 if there is no vowel target.
	 */
	function resolveTonePlacement( state, tonePlacement ) {
		if ( !state.structure ) {
			prepareState( state, tonePlacement );
		}

		return state.structure ? findToneTarget( state, state.structure, tonePlacement ) : -1;
	}

	/**
	 * Render a Vietnamese composition state to normalized output text.
	 *
	 * @param {Object} state Composition state.
	 * @param {string} [tonePlacement] Tone-placement policy.
	 * @return {string} NFC output.
	 */
	function renderCandidate( state, tonePlacement ) {
		var i,
			output = '',
			toneTarget = resolveTonePlacement( state, tonePlacement );

		for ( i = 0; i < state.tokens.length; i++ ) {
			output += renderToken(
				state.tokens[ i ],
				i === toneTarget ? state.tone : Vietnamese.Tone.NONE
			);
		}

		return normalizeText( output, 'NFC' );
	}

	function setStateTone( state, tone, tonePlacement ) {
		var i,
			toneTarget = resolveTonePlacement( state, tonePlacement );

		state.tone = tone;
		for ( i = 0; i < state.tokens.length; i++ ) {
			state.tokens[ i ].tone = i === toneTarget ? tone : Vietnamese.Tone.NONE;
		}
	}

	function canApplyTone( state, tone, tonePlacement ) {
		if ( resolveTonePlacement( state, tonePlacement ) === -1 ) {
			return false;
		}

		if (
			state.structure &&
			state.structure.checked &&
			tone !== Vietnamese.Tone.ACUTE &&
			tone !== Vietnamese.Tone.DOT
		) {
			return false;
		}

		return true;
	}

	function applyTone( state, command, tonePlacement ) {
		var nextState,
			tone = command.tone;

		if ( !canApplyTone( state, tone, tonePlacement ) ) {
			return null;
		}

		nextState = cloneState( state );
		if ( state.tone === tone ) {
			setStateTone( nextState, Vietnamese.Tone.NONE, tonePlacement );
			return resultFromState( nextState, command.literal, tonePlacement );
		}

		setStateTone( nextState, tone, tonePlacement );
		return resultFromState( nextState, null, tonePlacement );
	}

	function removeTone( state, tonePlacement ) {
		var nextState;

		if ( state.tone === Vietnamese.Tone.NONE ) {
			return null;
		}

		nextState = cloneState( state );
		setStateTone( nextState, Vietnamese.Tone.NONE, tonePlacement );
		return resultFromState( nextState, null, tonePlacement );
	}

	function resolveVowelDiacriticTarget( state, vowelDiacritic ) {
		var target = resolveTonePlacement( state );

		if (
			target !== -1 &&
			state.tokens[ target ].vowelDiacritic === Vietnamese.VowelDiacritic.NONE &&
			isValidVowelDiacritic( state.tokens[ target ].base, vowelDiacritic )
		) {
			return target;
		}

		return -1;
	}

	function resolveAdditionalVowelDiacriticTarget( state, vowelDiacritic, excludedTarget ) {
		var i, index, token,
			vowels = state.structure.vowels.indices;

		for ( i = vowels.length - 1; i >= 0; i-- ) {
			index = vowels[ i ];
			token = state.tokens[ index ];

			if (
				index !== excludedTarget &&
				token.vowelDiacritic === Vietnamese.VowelDiacritic.NONE &&
				isValidVowelDiacritic( token.base, vowelDiacritic )
			) {
				return index;
			}
		}

		return -1;
	}

	function applyVowelDiacriticToTarget( state, target, vowelDiacritic, tonePlacement ) {
		var nextState = cloneState( state );

		nextState.tokens[ target ].vowelDiacritic = vowelDiacritic;
		return resultFromState( nextState, null, tonePlacement );
	}

	function isIgnoredVowelPair( state, firstIndex ) {
		return !!(
			state.structure &&
			( state.structure.ignoredVowelIndices[ firstIndex ] ||
				state.structure.ignoredVowelIndices[ firstIndex + 1 ] )
		);
	}

	function findHornUoPair( state ) {
		var i, firstToken, secondToken;

		if ( state.structure && state.structure.rime === 'uo' ) {
			return -1;
		}

		for ( i = state.tokens.length - 2; i >= 0; i-- ) {
			firstToken = state.tokens[ i ];
			secondToken = state.tokens[ i + 1 ];

			if (
				firstToken.isVowel &&
				secondToken.isVowel &&
				firstToken.base.toLowerCase() === 'u' &&
				secondToken.base.toLowerCase() === 'o' &&
				firstToken.vowelDiacritic === Vietnamese.VowelDiacritic.NONE &&
				secondToken.vowelDiacritic === Vietnamese.VowelDiacritic.NONE &&
				!isIgnoredVowelPair( state, i )
			) {
				return i;
			}
		}

		return -1;
	}

	function findUoFamilyPair( state, firstVowelDiacritic, secondVowelDiacritic ) {
		var i, firstToken, secondToken;

		for ( i = state.tokens.length - 2; i >= 0; i-- ) {
			firstToken = state.tokens[ i ];
			secondToken = state.tokens[ i + 1 ];

			if (
				firstToken.isVowel &&
				secondToken.isVowel &&
				firstToken.base.toLowerCase() === 'u' &&
				secondToken.base.toLowerCase() === 'o' &&
				firstToken.vowelDiacritic === firstVowelDiacritic &&
				secondToken.vowelDiacritic === secondVowelDiacritic &&
				!isIgnoredVowelPair( state, i )
			) {
				return i;
			}
		}

		return -1;
	}

	function findHornUaPair( state ) {
		var i, firstToken, secondToken;

		for ( i = state.tokens.length - 2; i >= 0; i-- ) {
			firstToken = state.tokens[ i ];
			secondToken = state.tokens[ i + 1 ];

			if (
				firstToken.isVowel &&
				secondToken.isVowel &&
				firstToken.base.toLowerCase() === 'u' &&
				secondToken.base.toLowerCase() === 'a' &&
				firstToken.vowelDiacritic === Vietnamese.VowelDiacritic.NONE &&
				secondToken.vowelDiacritic === Vietnamese.VowelDiacritic.NONE &&
				!isIgnoredVowelPair( state, i )
			) {
				return i;
			}
		}

		return -1;
	}

	function applyHornToUo( state, tonePlacement ) {
		var pairStart = findHornUoPair( state ),
			nextState;

		if ( pairStart === -1 ) {
			return null;
		}

		nextState = cloneState( state );
		nextState.tokens[ pairStart ].vowelDiacritic = Vietnamese.VowelDiacritic.HORN;
		nextState.tokens[ pairStart + 1 ].vowelDiacritic = Vietnamese.VowelDiacritic.HORN;
		return resultFromState( nextState, null, tonePlacement );
	}

	function applyHornToUa( state, tonePlacement ) {
		var pairStart = findHornUaPair( state ),
			nextState;

		if ( pairStart === -1 ) {
			return null;
		}

		nextState = cloneState( state );
		nextState.tokens[ pairStart ].vowelDiacritic = Vietnamese.VowelDiacritic.HORN;
		return resultFromState( nextState, null, tonePlacement );
	}

	function applyHornToCircumflexUo( state, tonePlacement ) {
		var pairStart = findUoFamilyPair(
				state,
				Vietnamese.VowelDiacritic.NONE,
				Vietnamese.VowelDiacritic.CIRCUMFLEX
			),
			nextState;

		if ( pairStart === -1 ) {
			return null;
		}

		nextState = cloneState( state );
		nextState.tokens[ pairStart ].vowelDiacritic = Vietnamese.VowelDiacritic.HORN;
		nextState.tokens[ pairStart + 1 ].vowelDiacritic = Vietnamese.VowelDiacritic.HORN;
		return resultFromState( nextState, null, tonePlacement );
	}

	function applyCircumflexToHornUo( state, tonePlacement ) {
		var pairStart = findUoFamilyPair(
				state,
				Vietnamese.VowelDiacritic.HORN,
				Vietnamese.VowelDiacritic.HORN
			),
			nextState;

		if ( pairStart === -1 ) {
			return null;
		}

		nextState = cloneState( state );
		nextState.tokens[ pairStart ].vowelDiacritic = Vietnamese.VowelDiacritic.NONE;
		nextState.tokens[ pairStart + 1 ].vowelDiacritic = Vietnamese.VowelDiacritic.CIRCUMFLEX;
		return resultFromState( nextState, null, tonePlacement );
	}

	function removeVowelDiacritic( state, target, literal, tonePlacement ) {
		var nextState = cloneState( state );

		nextState.tokens[ target ].vowelDiacritic = Vietnamese.VowelDiacritic.NONE;
		return resultFromState( nextState, literal, tonePlacement );
	}

	function removeHornFromUo( state, literal, tonePlacement ) {
		var target = resolveTonePlacement( state ),
			previousToken,
			nextState;

		if ( target < 1 ) {
			return null;
		}

		previousToken = state.tokens[ target - 1 ];
		if (
			!previousToken ||
			!previousToken.isVowel ||
			previousToken.vowelDiacritic !== Vietnamese.VowelDiacritic.HORN ||
			state.tokens[ target ].vowelDiacritic !== Vietnamese.VowelDiacritic.HORN
		) {
			return null;
		}

		nextState = cloneState( state );
		nextState.tokens[ target - 1 ].vowelDiacritic = Vietnamese.VowelDiacritic.NONE;
		nextState.tokens[ target ].vowelDiacritic = Vietnamese.VowelDiacritic.NONE;
		return resultFromState( nextState, literal, tonePlacement );
	}

	function applySimpleVowelDiacritic( state, command, tonePlacement ) {
		var target = resolveVowelDiacriticTarget( state, command.vowelDiacritic );

		if ( target === -1 ) {
			return null;
		}

		return applyVowelDiacriticToTarget( state, target, command.vowelDiacritic, tonePlacement );
	}

	function canSwitchTokenVowelDiacritic( token, vowelDiacritic ) {
		var lowerBase = token.base.toLowerCase();

		if ( lowerBase === 'a' ) {
			return token.vowelDiacritic === Vietnamese.VowelDiacritic.CIRCUMFLEX &&
					vowelDiacritic === Vietnamese.VowelDiacritic.BREVE ||
				token.vowelDiacritic === Vietnamese.VowelDiacritic.BREVE &&
					vowelDiacritic === Vietnamese.VowelDiacritic.CIRCUMFLEX;
		}

		if ( lowerBase === 'o' ) {
			return token.vowelDiacritic === Vietnamese.VowelDiacritic.CIRCUMFLEX &&
					vowelDiacritic === Vietnamese.VowelDiacritic.HORN ||
				token.vowelDiacritic === Vietnamese.VowelDiacritic.HORN &&
					vowelDiacritic === Vietnamese.VowelDiacritic.CIRCUMFLEX;
		}

		return false;
	}

	function applySameBaseVowelDiacriticSwitch( state, vowelDiacritic, tonePlacement ) {
		var nextState,
			target = resolveTonePlacement( state ),
			token;

		if ( target === -1 ) {
			return null;
		}

		token = state.tokens[ target ];
		if ( canSwitchTokenVowelDiacritic( token, vowelDiacritic ) ) {
			nextState = cloneState( state );
			nextState.tokens[ target ].vowelDiacritic = vowelDiacritic;
			return resultFromState( nextState, null, tonePlacement );
		}

		return null;
	}

	function applyVowelDiacritic( state, command, tonePlacement ) {
		var alternateTarget,
			target = resolveTonePlacement( state ),
			vowelDiacritic = command.vowelDiacritic;

		if (
			target !== -1 &&
			state.tokens[ target ].vowelDiacritic === vowelDiacritic &&
			command.literal
		) {
			alternateTarget = resolveAdditionalVowelDiacriticTarget( state, vowelDiacritic, target );
			if ( alternateTarget !== -1 ) {
				return applyVowelDiacriticToTarget( state, alternateTarget, vowelDiacritic, tonePlacement );
			}

			if ( vowelDiacritic === Vietnamese.VowelDiacritic.HORN ) {
				return removeHornFromUo( state, command.literal, tonePlacement ) ||
					removeVowelDiacritic( state, target, command.literal, tonePlacement );
			}

			return removeVowelDiacritic( state, target, command.literal, tonePlacement );
		}

		if ( vowelDiacritic === Vietnamese.VowelDiacritic.HORN ) {
			return applyHornToCircumflexUo( state, tonePlacement ) ||
				applyHornToUo( state, tonePlacement ) ||
				applyHornToUa( state, tonePlacement ) ||
				applySameBaseVowelDiacriticSwitch( state, vowelDiacritic, tonePlacement ) ||
				applySimpleVowelDiacritic( state, command, tonePlacement );
		}

		if ( vowelDiacritic === Vietnamese.VowelDiacritic.CIRCUMFLEX ) {
			return applyCircumflexToHornUo( state, tonePlacement ) ||
				applySameBaseVowelDiacriticSwitch( state, vowelDiacritic, tonePlacement ) ||
				applySimpleVowelDiacritic( state, command, tonePlacement );
		}

		return applySameBaseVowelDiacriticSwitch( state, vowelDiacritic, tonePlacement ) ||
			applySimpleVowelDiacritic( state, command, tonePlacement );
	}

	function resolveDStrokeTarget( state ) {
		var token;

		if ( !state.structure ) {
			prepareState( state );
		}

		token = state.tokens[ 0 ];
		if (
			!token ||
			!state.structure ||
			( state.structure.onset !== 'd' && state.structure.onset !== '\u0111' )
		) {
			return -1;
		}

		if ( token.dStroke || token.base === 'd' || token.base === 'D' ) {
			return 0;
		}

		return -1;
	}

	function applyDStroke( state, command, tonePlacement ) {
		var nextState,
			target = resolveDStrokeTarget( state );

		if ( target === -1 ) {
			return null;
		}

		if ( state.tokens[ target ].dStroke ) {
			if ( !command.literal ) {
				return null;
			}

			nextState = cloneState( state );
			nextState.tokens[ target ].dStroke = false;
			return resultFromState( nextState, command.literal, tonePlacement );
		}

		nextState = cloneState( state );
		nextState.tokens[ target ].dStroke = true;
		return resultFromState( nextState, null, tonePlacement );
	}

	function transformState( state, command, tonePlacement ) {
		if ( state.status === Vietnamese.StateType.UNRECOGNIZED ) {
			return null;
		}

		if ( command.type === Vietnamese.CommandType.APPLY_TONE ) {
			return applyTone( state, command, tonePlacement );
		}

		if ( command.type === Vietnamese.CommandType.REMOVE_TONE ) {
			return removeTone( state, tonePlacement );
		}

		if ( command.type === Vietnamese.CommandType.APPLY_VOWEL_DIACRITIC ) {
			return applyVowelDiacritic( state, command, tonePlacement );
		}

		if ( command.type === Vietnamese.CommandType.APPLY_D_STROKE ) {
			return applyDStroke( state, command, tonePlacement );
		}

		return null;
	}

	/**
	 * Create a jQuery.IME patterns function backed by a shared Vietnamese engine.
	 *
	 * @param {Object} options Adapter options.
	 * @param {Function} [options.decodeCommand] Input-method-specific command decoder.
	 *  Decoders return either a shared semantic command or an adapter-level
	 *  literal replacement for input-method escape keys.
	 * @param {Object} [options.engine] Shared Vietnamese composition engine.
	 * @param {string} options.inputMethodId Input method id passed to the engine.
	 * @param {string} [options.tonePlacement] Tone-placement policy.
	 * @return {Function} jQuery.IME patterns function.
	 */
	function createAdapter( options ) {
		var decodeCommand = options.decodeCommand || decodeNoCommand,
			adapterEngine = options.engine || engine,
			inputMethodId = options.inputMethodId,
			tonePlacement = normalizeTonePlacement( options.tonePlacement );

		return function ( input, context ) {
			var decoded = decodeCommand( input, context, {
					inputMethodId: inputMethodId,
					tonePlacement: tonePlacement
				} ),
				extracted, result;

			if ( !decoded ) {
				if ( typeof adapterEngine.reflowCandidate !== 'function' ) {
					return passThrough( input );
				}

				extracted = extractCandidate( input, '' );
				if ( !extracted.candidate ) {
					return passThrough( input );
				}

				result = adapterEngine.reflowCandidate( extracted.candidate, {
					context: context,
					inputMethodId: inputMethodId,
					tonePlacement: tonePlacement
				} );

				if ( !result || !result.handled ) {
					return passThrough( input );
				}

				return {
					noop: false,
					output: extracted.prefix + result.output
				};
			}

			extracted = extractCandidate( input, decoded.key );
			if ( decoded.literalOutput !== undefined ) {
				return {
					noop: false,
					output: extracted.prefix + extracted.candidate + decoded.literalOutput
				};
			}

			if ( !extracted.candidate ) {
				return passThrough( input );
			}

			result = adapterEngine.transformCandidate( extracted.candidate, decoded.command, {
				context: context,
				inputMethodId: inputMethodId,
				tonePlacement: tonePlacement
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

	function escapeRegexClassCharacter( character ) {
		if ( character === '\\' || character === ']' || character === '-' || character === '^' ) {
			return '\\' + character;
		}

		return character;
	}

	/**
	 * Create array-based shifted patterns that delegate back to an adapter.
	 *
	 * jQuery.IME gives array `patterns_shift` priority while Shift is pressed.
	 * Vietnamese adapters use functional `patterns`, so VIQR-family shifted
	 * punctuation needs this bridge to keep using the shared engine.
	 *
	 * @param {Function} adapter Functional Vietnamese patterns adapter.
	 * @param {string[]} shiftedKeys Shifted command characters handled by adapter.
	 * @return {Array[]} jQuery.IME array rules for `patterns_shift`.
	 */
	function createShiftedAdapterPatterns( adapter, shiftedKeys ) {
		var shiftedKeyPattern = shiftedKeys.map( escapeRegexClassCharacter ).join( '' );

		return [
			[
				'[\\s\\S]*[' + shiftedKeyPattern + ']',
				function ( input ) {
					var result = adapter( input, '' );

					return result.noop ? input : result.output;
				}
			]
		];
	}

	/**
	 * Register a Vietnamese input method that delegates composition to the
	 * shared adapter and engine boundary.
	 *
	 * @param {string} inputMethodId Input method id registered with jQuery.IME.
	 * @param {string} name Human-readable input method name.
	 * @param {string} description Input method description.
	 * @param {Function} decodeCommand Input-method-specific command decoder.
	 * @param {string[]} [shiftedKeys] Shifted command keys that need a patterns bridge.
	 * @param {string} [tonePlacement] Tone-placement policy.
	 */
	function registerInputMethod(
		inputMethodId, name, description, decodeCommand, shiftedKeys, tonePlacement
	) {
		var normalizedTonePlacement = normalizeTonePlacement( tonePlacement ),
			adapter = createAdapter( {
				inputMethodId: inputMethodId,
				decodeCommand: decodeCommand,
				engine: engine,
				tonePlacement: normalizedTonePlacement
			} ),
			inputMethod = {
				id: inputMethodId,
				name: name,
				description: description,
				date: '2026-09-01',
				author: 'Plantaest',
				license: 'GPLv3',
				version: '0.2.0',
				contextLength: DEFAULT_CONTEXT_LENGTH,
				maxKeyLength: DEFAULT_MAX_KEY_LENGTH,
				tonePlacement: normalizedTonePlacement,
				patterns: adapter
			};

		if ( shiftedKeys && shiftedKeys.length ) {
			inputMethod.patterns_shift = createShiftedAdapterPatterns( adapter, shiftedKeys );
		}

		$.ime.register( inputMethod );
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

	Vietnamese.TonePlacement = Vietnamese.TonePlacement || {
		TRADITIONAL: 'traditional',
		REFORMED: 'reformed'
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
		 * @param {Object} [options] Engine options.
		 * @param {string} [options.tonePlacement] Tone-placement policy.
		 * @return {Object} Result object with handled and output fields.
		 */
		transformCandidate: function ( candidate, command, options ) {
			var transformResult,
				tonePlacement = options && options.tonePlacement,
				state = parseCandidate( candidate, tonePlacement );

			transformResult = transformState( state, command, tonePlacement );
			if ( !transformResult ) {
				return {
					handled: false
				};
			}

			return {
				handled: true,
				output: renderCandidate( transformResult.state, tonePlacement ) +
					transformResult.literalSuffix
			};
		},

		/**
		 * Re-render a toned candidate after ordinary letters extend it.
		 *
		 * @param {string} candidate Candidate text near the caret.
		 * @param {Object} [options] Engine options.
		 * @param {string} [options.tonePlacement] Tone-placement policy.
		 * @return {Object} Result object with handled and output fields.
		 */
		reflowCandidate: function ( candidate, options ) {
			var output,
				tonePlacement = options && options.tonePlacement,
				state = parseCandidate( candidate, tonePlacement );

			if (
				state.status === Vietnamese.StateType.UNRECOGNIZED ||
				state.tone === Vietnamese.Tone.NONE
			) {
				return {
					handled: false
				};
			}

			output = renderCandidate( state, tonePlacement );
			if ( output === normalizeText( candidate, 'NFC' ) ) {
				return {
					handled: false
				};
			}

			return {
				handled: true,
				output: output
			};
		}
	};

	Vietnamese.DEFAULT_CONTEXT_LENGTH = DEFAULT_CONTEXT_LENGTH;
	Vietnamese.DEFAULT_MAX_KEY_LENGTH = DEFAULT_MAX_KEY_LENGTH;
	Vietnamese.createAdapter = createAdapter;
	Vietnamese.decodeVNICommand = decodeVNICommand;
	Vietnamese.decodeTelexCommand = decodeTelexCommand;
	Vietnamese.decodeVIQRCommand = decodeVIQRCommand;
	Vietnamese.decodeVIQRStarCommand = decodeVIQRStarCommand;
	Vietnamese.decodeNoCommand = decodeNoCommand;
	Vietnamese.extractCandidate = extractCandidate;
	Vietnamese.parseCandidate = parseCandidate;
	Vietnamese.renderCandidate = renderCandidate;
	Vietnamese.resolveTonePlacement = resolveTonePlacement;
	Vietnamese.engine = engine;

	$.ime.vi = Vietnamese;

	registerInputMethod(
		'vi-vni',
		'VNI',
		'Vietnamese VNI input method',
		decodeVNICommand
	);
	registerInputMethod(
		'vi-telex',
		'Telex',
		'Vietnamese Telex input method',
		decodeTelexCommand
	);
	registerInputMethod(
		'vi-viqr',
		'VIQR',
		'Vietnamese VIQR input method',
		decodeVIQRCommand,
		[ '?', '~', '^', '(', '+' ]
	);
	registerInputMethod(
		'vi-viqr-star',
		'VIQR*',
		'Vietnamese VIQR* input method',
		decodeVIQRStarCommand,
		[ '?', '~', '^', '(', '*' ]
	);
	registerInputMethod(
		'vi-vni-reformed',
		'VNI (đặt dấu kiểu mới)',
		'Vietnamese VNI input method with reformed tone placement',
		decodeVNICommand,
		null,
		Vietnamese.TonePlacement.REFORMED
	);
	registerInputMethod(
		'vi-telex-reformed',
		'Telex (đặt dấu kiểu mới)',
		'Vietnamese Telex input method with reformed tone placement',
		decodeTelexCommand,
		null,
		Vietnamese.TonePlacement.REFORMED
	);
	registerInputMethod(
		'vi-viqr-reformed',
		'VIQR (đặt dấu kiểu mới)',
		'Vietnamese VIQR input method with reformed tone placement',
		decodeVIQRCommand,
		[ '?', '~', '^', '(', '+' ],
		Vietnamese.TonePlacement.REFORMED
	);
	registerInputMethod(
		'vi-viqr-star-reformed',
		'VIQR* (đặt dấu kiểu mới)',
		'Vietnamese VIQR* input method with reformed tone placement',
		decodeVIQRStarCommand,
		[ '?', '~', '^', '(', '*' ],
		Vietnamese.TonePlacement.REFORMED
	);
}( jQuery ) );
