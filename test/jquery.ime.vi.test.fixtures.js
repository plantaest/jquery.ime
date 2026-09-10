/* global testFixtures */
testFixtures.push( {
	description: 'Vietnamese VNI vertical slice test',
	inputmethod: 'vi-vni',
	tests: [
		{ input: 'a1', output: 'á', description: 'Vietnamese VNI a1 -> á' },
		{ input: 'a2', output: 'à', description: 'Vietnamese VNI a2 -> à' },
		{ input: 'a6', output: 'â', description: 'Vietnamese VNI a6 -> â' },
		{ input: 'a8', output: 'ă', description: 'Vietnamese VNI a8 -> ă' },
		{ input: 'o7', output: 'ơ', description: 'Vietnamese VNI o7 -> ơ' },
		{ input: 'u7', output: 'ư', description: 'Vietnamese VNI u7 -> ư' },
		{ input: 'á2', output: 'à', description: 'Vietnamese VNI tone replacement' },
		{ input: 'á0', output: 'a', description: 'Vietnamese VNI tone removal' },
		{ input: 'ấ0', output: 'â', description: 'Vietnamese VNI tone removal preserves vowel diacritic' },
		{ input: 'á6', output: 'ấ', description: 'Vietnamese VNI vowel diacritic preserves tone' },
		{ input: 'd9', output: 'đ', description: 'Vietnamese VNI d9 -> đ' },
		{ input: 'D9', output: 'Đ', description: 'Vietnamese VNI D9 -> Đ' },
		{ input: 'd9ac1', output: 'đác', description: 'Vietnamese VNI d-stroke before rime material' },
		{ input: 'dac91', output: 'đác', description: 'Vietnamese VNI d-stroke after rime material' },
		{ input: 'dac99', output: 'dac9', description: 'Vietnamese VNI d-stroke repeated-key escape after rime material' },
		{ input: 'hoa2', output: 'hòa', description: 'Vietnamese VNI traditional tone placement' },
		{ input: 'hoan2', output: 'hoàn', description: 'Vietnamese VNI oa plus ending placement' },
		{ input: 'to1an', output: 'toán', description: 'Vietnamese VNI reflows tone after extending tó' },
		{ input: 'hoa2n', output: 'hoàn', description: 'Vietnamese VNI reflows tone after extending hòa' },
		{ input: 'huy3', output: 'hủy', description: 'Vietnamese VNI traditional open uy placement' },
		{ input: 'huynh2', output: 'huỳnh', description: 'Vietnamese VNI uy plus ending placement' },
		{ input: 'coi4', output: 'cõi', description: 'Vietnamese VNI oi placement' },
		{ input: 'kheo1', output: 'khéo', description: 'Vietnamese VNI eo placement' },
		{ input: 'thay61', output: 'thấy', description: 'Vietnamese VNI ay circumflex and tone placement' },
		{ input: 'thay16', output: 'thấy', description: 'Vietnamese VNI tone before circumflex converges' },
		{ input: 'khuay61', output: 'khuấy', description: 'Vietnamese VNI uay circumflex and tone placement' },
		{ input: 'huo7', output: 'huơ', description: 'Vietnamese VNI open uo plus horn' },
		{ input: 'hua71', output: 'hứa', description: 'Vietnamese VNI ua plus horn and tone' },
		{ input: 'huop61', output: 'huốp', description: 'Vietnamese VNI uop plus circumflex and tone' },
		{ input: 'huop71', output: 'hướp', description: 'Vietnamese VNI uop plus horn and tone' },
		{ input: 'huop617', output: 'hướp', description: 'Vietnamese VNI uô changes to ươ' },
		{ input: 'huop716', output: 'huốp', description: 'Vietnamese VNI ươ changes to uô' },
		{ input: 'huya1', output: 'huýa', description: 'Vietnamese VNI rare uya tone placement' },
		{ input: 'lo6o62ng', output: 'lôồng', description: 'Vietnamese VNI explicit double circumflex oo spelling' },
		{ input: 'quoc61', output: 'quốc', description: 'Vietnamese VNI qu special onset' },
		{ input: 'Quoc61', output: 'Quốc', description: 'Vietnamese VNI mixed-case qu special onset' },
		{ input: 'gieng61', output: 'giếng', description: 'Vietnamese VNI gi special onset' },
		{ input: 'THAY61', output: 'THẤY', description: 'Vietnamese VNI uppercase tone placement' },
		{ input: 'mat1', output: 'mát', description: 'Vietnamese VNI checked syllable acute tone' },
		{ input: 'mat5', output: 'mạt', description: 'Vietnamese VNI checked syllable dot tone' },
		{ input: 'mat2', output: 'mat2', description: 'Vietnamese VNI checked syllable incompatible tone pass-through' },
		{ input: 'a11', output: 'a1', description: 'Vietnamese VNI repeated tone key escape' },
		{ input: 'a66', output: 'a6', description: 'Vietnamese VNI repeated vowel-diacritic key escape' },
		{ input: 'd99', output: 'd9', description: 'Vietnamese VNI repeated d-stroke key escape' },
		{ input: 'tuong7', output: 'tương', description: 'Vietnamese VNI uo7 -> ươ' },
		{ input: 'tuong72', output: 'tường', description: 'Vietnamese VNI uo7 plus tone' }
	]
} );

testFixtures.push( {
	description: 'Vietnamese Telex adapter test',
	inputmethod: 'vi-telex',
	tests: [
		{ input: 'tieengs', output: 'tiếng', description: 'Vietnamese Telex tieengs -> tiếng' },
		{ input: 'Vieetj', output: 'Việt', description: 'Vietnamese Telex Vieetj -> Việt' },
		{ input: 'thayas', output: 'thấy', description: 'Vietnamese Telex delayed circumflex before off-glide' },
		{ input: 'thayw', output: 'thayw', description: 'Vietnamese Telex w stays literal after off-glide' },
		{ input: 'thangws', output: 'thắng', description: 'Vietnamese Telex delayed breve after coda' },
		{ input: 'haamw', output: 'hăm', description: 'Vietnamese Telex switches circumflex a to breve' },
		{ input: 'hoposw', output: 'hớp', description: 'Vietnamese Telex switches circumflex o to horn' },
		{ input: 'huaws', output: 'hứa', description: 'Vietnamese Telex ua plus horn and tone' },
		{ input: 'hoaos', output: 'hoáo', description: 'Vietnamese Telex keeps oao rime before tone' },
		{ input: 'hoeos', output: 'hoéo', description: 'Vietnamese Telex keeps oeo rime before tone' },
		{ input: 'dduwowngf', output: 'đường', description: 'Vietnamese Telex dduwowngf -> đường' },
		{ input: 'dacds', output: 'đác', description: 'Vietnamese Telex delayed d-stroke after rime material' },
		{ input: 'huopwso', output: 'huốp', description: 'Vietnamese Telex uo-family switch after horn and tone' },
		{ input: 'thuongwf', output: 'thường', description: 'Vietnamese Telex delayed w horn plus tone' },
		{ input: 'hoaf', output: 'hòa', description: 'Vietnamese Telex traditional tone placement' },
		{ input: 'quoocs', output: 'quốc', description: 'Vietnamese Telex qu special onset' },
		{ input: 'quocos', output: 'quốc', description: 'Vietnamese Telex delayed o with qu special onset' },
		{ input: 'gieengs', output: 'giếng', description: 'Vietnamese Telex gi special onset' },
		{ input: 'gienges', output: 'giếng', description: 'Vietnamese Telex delayed e with gi special onset' },
		{ input: 'mats', output: 'mát', description: 'Vietnamese Telex checked syllable acute tone' },
		{ input: 'matj', output: 'mạt', description: 'Vietnamese Telex checked syllable dot tone' },
		{ input: 'matf', output: 'matf', description: 'Vietnamese Telex checked syllable grave pass-through' },
		{ input: 'matx', output: 'matx', description: 'Vietnamese Telex checked syllable tilde pass-through' },
		{ input: 'toansz', output: 'toan', description: 'Vietnamese Telex z removes tone' },
		{ input: 'ass', output: 'as', description: 'Vietnamese Telex repeated tone key escape' },
		{ input: 'aaa', output: 'aa', description: 'Vietnamese Telex repeated circumflex key escape' },
		{ input: 'uww', output: 'uw', description: 'Vietnamese Telex repeated horn key escape' },
		{ input: 'ww', output: 'ww', description: 'Vietnamese Telex standalone w remains literal' },
		{ input: 'ddd', output: 'dd', description: 'Vietnamese Telex repeated d-stroke key escape' },
		{ input: 'w', output: 'w', description: 'Vietnamese Telex standalone w remains literal' },
		{ input: '[', output: '[', description: 'Vietnamese Telex [ remains literal' },
		{ input: ']', output: ']', description: 'Vietnamese Telex ] remains literal' }
	]
} );

testFixtures.push( {
	description: 'Vietnamese VNI reformed tone-placement test',
	inputmethod: 'vi-vni-reformed',
	tests: [
		{ input: 'hoa2', output: 'hoà', description: 'Vietnamese VNI reformed open oa placement' },
		{ input: 'khoe3', output: 'khoẻ', description: 'Vietnamese VNI reformed open oe placement' },
		{ input: 'huy3', output: 'huỷ', description: 'Vietnamese VNI reformed open uy placement' },
		{ input: 'hoan2', output: 'hoàn', description: 'Vietnamese VNI reformed oa plus ending placement' },
		{ input: 'huynh2', output: 'huỳnh', description: 'Vietnamese VNI reformed uy plus ending placement' },
		{ input: 'hoa2n', output: 'hoàn', description: 'Vietnamese VNI reformed reflows after extending hoà' }
	]
} );

testFixtures.push( {
	description: 'Vietnamese Telex reformed tone-placement test',
	inputmethod: 'vi-telex-reformed',
	tests: [
		{ input: 'hoaf', output: 'hoà', description: 'Vietnamese Telex reformed open oa placement' },
		{ input: 'khoer', output: 'khoẻ', description: 'Vietnamese Telex reformed open oe placement' },
		{ input: 'huyr', output: 'huỷ', description: 'Vietnamese Telex reformed open uy placement' },
		{ input: 'huynhf', output: 'huỳnh', description: 'Vietnamese Telex reformed uy plus ending placement' },
		{ input: 'quoocs', output: 'quốc', description: 'Vietnamese Telex reformed keeps qu behavior shared' },
		{ input: 'tieengs', output: 'tiếng', description: 'Vietnamese Telex reformed keeps iê behavior shared' }
	]
} );

testFixtures.push( {
	description: 'Vietnamese VIQR adapter test',
	inputmethod: 'vi-viqr',
	tests: [
		{ input: 'tie^\'ng', output: 'tiếng', description: 'Vietnamese VIQR tie^\'ng -> tiếng' },
		{ input: 'Vie^.t', output: 'Việt', description: 'Vietnamese VIQR Vie^.t -> Việt' },
		{ input: 'ddu+o+`ng', output: 'đường', description: 'Vietnamese VIQR ddu+o+`ng -> đường' },
		{ input: 'dacd\'', output: 'đác', description: 'Vietnamese VIQR delayed d-stroke before tone' },
		{ input: 'tan?', output: 'tản', description: 'Vietnamese VIQR question-mark tone' },
		{ input: 'tan\\?', output: 'tan?', description: 'Vietnamese VIQR backslash escapes question mark' },
		{
			input: [
				[ 'a', false ],
				[ '\'', false ],
				[ ' ', false ],
				[ 'a', false ],
				[ '`', false ],
				[ ' ', false ],
				[ 'a', false ],
				[ '?', false, true ],
				[ ' ', false ],
				[ 'a', false ],
				[ '~', false, true ],
				[ ' ', false ],
				[ 'a', false ],
				[ '^', false, true ],
				[ ' ', false ],
				[ 'u', false ],
				[ '+', false, true ],
				[ ' ', false ],
				[ 'a', false ],
				[ '(', false, true ],
				[ ' ', false ],
				[ 'd', false ],
				[ 'd', false ]
			],
			output: 'á à ả ã â ư ă đ',
			description: 'Vietnamese VIQR shifted punctuation works through patterns_shift'
		},
		{
			input: [
				[ 't', false ],
				[ 'a', false ],
				[ 'n', false ],
				[ '\\', false ],
				[ '?', false, true ]
			],
			output: 'tan?',
			description: 'Vietnamese VIQR shifted punctuation preserves backslash escape'
		},
		{ input: 'toan\'0', output: 'toan', description: 'Vietnamese VIQR 0 removes tone' }
	]
} );

testFixtures.push( {
	description: 'Vietnamese VIQR reformed tone-placement test',
	inputmethod: 'vi-viqr-reformed',
	tests: [
		{ input: 'hoa`', output: 'hoà', description: 'Vietnamese VIQR reformed open oa placement' },
		{ input: 'khoe?', output: 'khoẻ', description: 'Vietnamese VIQR reformed open oe placement' },
		{ input: 'huy?', output: 'huỷ', description: 'Vietnamese VIQR reformed open uy placement' },
		{ input: 'huynh`', output: 'huỳnh', description: 'Vietnamese VIQR reformed uy plus ending placement' },
		{ input: 'tie^\'ng', output: 'tiếng', description: 'Vietnamese VIQR reformed keeps iê behavior shared' }
	]
} );

testFixtures.push( {
	description: 'Vietnamese VIQR* adapter test',
	inputmethod: 'vi-viqr-star',
	tests: [
		{ input: 'ddu*o*`ng', output: 'đường', description: 'Vietnamese VIQR* ddu*o*`ng -> đường' },
		{ input: 'dacd\'', output: 'đác', description: 'Vietnamese VIQR* delayed d-stroke before tone' },
		{ input: 'u*', output: 'ư', description: 'Vietnamese VIQR* u* -> ư' },
		{ input: 'o*', output: 'ơ', description: 'Vietnamese VIQR* o* -> ơ' },
		{ input: 'tan?', output: 'tản', description: 'Vietnamese VIQR* question-mark tone' },
		{ input: 'tan\\?', output: 'tan?', description: 'Vietnamese VIQR* backslash escapes question mark' },
		{
			input: [
				[ 'u', false ],
				[ '*', false, true ]
			],
			output: 'ư',
			description: 'Vietnamese VIQR* shifted star works through patterns_shift'
		},
		{
			input: [
				[ 'o', false ],
				[ '\\', false ],
				[ '*', false, true ]
			],
			output: 'o*',
			description: 'Vietnamese VIQR* shifted star preserves backslash escape'
		},
		{ input: 'o\\*', output: 'o*', description: 'Vietnamese VIQR* backslash escapes star' }
	]
} );

testFixtures.push( {
	description: 'Vietnamese VIQR* reformed tone-placement test',
	inputmethod: 'vi-viqr-star-reformed',
	tests: [
		{ input: 'hoa`', output: 'hoà', description: 'Vietnamese VIQR* reformed open oa placement' },
		{ input: 'huy?', output: 'huỷ', description: 'Vietnamese VIQR* reformed open uy placement' },
		{ input: 'ddu*o*`ng', output: 'đường', description: 'Vietnamese VIQR* reformed keeps star horn behavior shared' },
		{ input: 'o*', output: 'ơ', description: 'Vietnamese VIQR* reformed star horn' }
	]
} );
