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
		{ input: 'hoa2', output: 'hòa', description: 'Vietnamese VNI traditional tone placement' },
		{ input: 'tuong7', output: 'tương', description: 'Vietnamese VNI uo7 -> ươ' },
		{ input: 'tuong72', output: 'tường', description: 'Vietnamese VNI uo7 plus tone' }
	]
} );
