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
					literal: key,
					tone: toneCommands[ key ]
				}
			};
		}

		if ( vowelDiacriticCommands[ key ] ) {
			return {
				key: key,
				command: {
					type: Vietnamese.CommandType.APPLY_VOWEL_DIACRITIC,
					literal: key,
					vowelDiacritic: vowelDiacriticCommands[ key ]
				}
			};
		}

		if ( key === '0' ) {
			return {
				key: key,
				command: {
					type: Vietnamese.CommandType.REMOVE_TONE,
					literal: key
				}
			};
		}

		if ( key === '9' ) {
			return {
				key: key,
				command: {
					type: Vietnamese.CommandType.APPLY_D_STROKE,
					literal: key
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

	function resultFromState( state, literalSuffix ) {
		return {
			state: prepareState( state ),
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

	function resolveOnset( state, lowerText ) {
		var i,
			onsets = [
				'ngh',
				'ch',
				'gh',
				'kh',
				'ng',
				'nh',
				'ph',
				'th',
				'tr',
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

	function findToneTarget( state, structure ) {
		var patternTarget, offGlideTarget,
			vowels = structure.vowels;

		if ( vowels.indices.length === 0 ) {
			return -1;
		}

		if ( vowels.indices.length === 1 ) {
			return vowels.indices[ 0 ];
		}

		if ( structure.rime === 'oa' || structure.rime === 'oe' || structure.rime === 'uy' ) {
			return vowels.indices[ 0 ];
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

	function analyzeStructure( state ) {
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
		structure.toneTargetIndex = findToneTarget( state, structure );
		return structure;
	}

	function prepareState( state ) {
		var hasVowel = false;

		state.structure = analyzeStructure( state );
		hasVowel = state.structure.vowels.indices.length > 0;

		if ( !hasVowel ) {
			state.status = Vietnamese.StateType.INTERMEDIATE;
		} else {
			state.status = Vietnamese.StateType.STRUCTURALLY_VALID;
		}

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
	 * @return {Object} Composition state.
	 */
	function parseCandidate( candidate ) {
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

		return prepareState( state );
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
	 * @return {number} Token index, or -1 if there is no vowel target.
	 */
	function resolveTonePlacement( state ) {
		if ( !state.structure ) {
			prepareState( state );
		}

		return state.structure ? state.structure.toneTargetIndex : -1;
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

	function setStateTone( state, tone ) {
		var i,
			toneTarget = resolveTonePlacement( state );

		state.tone = tone;
		for ( i = 0; i < state.tokens.length; i++ ) {
			state.tokens[ i ].tone = i === toneTarget ? tone : Vietnamese.Tone.NONE;
		}
	}

	function canApplyTone( state, tone ) {
		if ( resolveTonePlacement( state ) === -1 ) {
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

	function applyTone( state, command ) {
		var nextState,
			tone = command.tone;

		if ( !canApplyTone( state, tone ) ) {
			return null;
		}

		nextState = cloneState( state );
		if ( state.tone === tone ) {
			setStateTone( nextState, Vietnamese.Tone.NONE );
			return resultFromState( nextState, command.literal );
		}

		setStateTone( nextState, tone );
		return resultFromState( nextState );
	}

	function removeTone( state ) {
		var nextState;

		if ( state.tone === Vietnamese.Tone.NONE ) {
			return null;
		}

		nextState = cloneState( state );
		setStateTone( nextState, Vietnamese.Tone.NONE );
		return resultFromState( nextState );
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

	function applyVowelDiacriticToTarget( state, target, vowelDiacritic ) {
		var nextState = cloneState( state );

		nextState.tokens[ target ].vowelDiacritic = vowelDiacritic;
		return resultFromState( nextState );
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
				!(
					state.structure &&
					( state.structure.ignoredVowelIndices[ i ] ||
						state.structure.ignoredVowelIndices[ i + 1 ] )
				)
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
				!(
					state.structure &&
					( state.structure.ignoredVowelIndices[ i ] ||
						state.structure.ignoredVowelIndices[ i + 1 ] )
				)
			) {
				return i;
			}
		}

		return -1;
	}

	function applyHornToUo( state ) {
		var pairStart = findHornUoPair( state ),
			nextState;

		if ( pairStart === -1 ) {
			return null;
		}

		nextState = cloneState( state );
		nextState.tokens[ pairStart ].vowelDiacritic = Vietnamese.VowelDiacritic.HORN;
		nextState.tokens[ pairStart + 1 ].vowelDiacritic = Vietnamese.VowelDiacritic.HORN;
		return resultFromState( nextState );
	}

	function applyHornToCircumflexUo( state ) {
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
		return resultFromState( nextState );
	}

	function applyCircumflexToHornUo( state ) {
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
		return resultFromState( nextState );
	}

	function removeVowelDiacritic( state, target, literal ) {
		var nextState = cloneState( state );

		nextState.tokens[ target ].vowelDiacritic = Vietnamese.VowelDiacritic.NONE;
		return resultFromState( nextState, literal );
	}

	function removeHornFromUo( state, literal ) {
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
		return resultFromState( nextState, literal );
	}

	function applySimpleVowelDiacritic( state, command ) {
		var target = resolveVowelDiacriticTarget( state, command.vowelDiacritic );

		if ( target === -1 ) {
			return null;
		}

		return applyVowelDiacriticToTarget( state, target, command.vowelDiacritic );
	}

	function applyVowelDiacritic( state, command ) {
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
				return applyVowelDiacriticToTarget( state, alternateTarget, vowelDiacritic );
			}

			if ( vowelDiacritic === Vietnamese.VowelDiacritic.HORN ) {
				return removeHornFromUo( state, command.literal ) ||
					removeVowelDiacritic( state, target, command.literal );
			}

			return removeVowelDiacritic( state, target, command.literal );
		}

		if ( vowelDiacritic === Vietnamese.VowelDiacritic.HORN ) {
			return applyHornToCircumflexUo( state ) ||
				applyHornToUo( state ) ||
				applySimpleVowelDiacritic( state, command );
		}

		if ( vowelDiacritic === Vietnamese.VowelDiacritic.CIRCUMFLEX ) {
			return applyCircumflexToHornUo( state ) ||
				applySimpleVowelDiacritic( state, command );
		}

		return applySimpleVowelDiacritic( state, command );
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

	function applyDStroke( state, command ) {
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
			return resultFromState( nextState, command.literal );
		}

		nextState = cloneState( state );
		nextState.tokens[ target ].dStroke = true;
		return resultFromState( nextState );
	}

	function transformState( state, command ) {
		if ( state.status === Vietnamese.StateType.UNRECOGNIZED ) {
			return null;
		}

		if ( command.type === Vietnamese.CommandType.APPLY_TONE ) {
			return applyTone( state, command );
		}

		if ( command.type === Vietnamese.CommandType.REMOVE_TONE ) {
			return removeTone( state );
		}

		if ( command.type === Vietnamese.CommandType.APPLY_VOWEL_DIACRITIC ) {
			return applyVowelDiacritic( state, command );
		}

		if ( command.type === Vietnamese.CommandType.APPLY_D_STROKE ) {
			return applyDStroke( state, command );
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
			var transformResult,
				state = parseCandidate( candidate );

			transformResult = transformState( state, command );
			if ( !transformResult ) {
				return {
					handled: false
				};
			}

			return {
				handled: true,
				output: renderCandidate( transformResult.state ) + transformResult.literalSuffix
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
