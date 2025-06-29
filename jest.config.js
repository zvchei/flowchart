module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['src'],
	transform: {
		'^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
	}
};
