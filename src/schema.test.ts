import type { SchemaDefinition } from './schema.d';
import { Schema, parseComponentConfiguration } from './schema';

// TODO: Check for missing tests (e.g. tuples, enums, etc.)
// TODO: Add tests for Schema.validate()

function areSchemasCompatible(from: SchemaDefinition, to: SchemaDefinition): { compatible: boolean; errors: string[] } {
	const {compatible, errors} = Schema.from(from, 'test').checkCompatibilityWith(to);
	return {
		compatible,
		errors: errors ? errors.map(error => `${error.locator}: ${error.message}`) : []
	};
}

describe('areSchemasCompatible', () => {
	let consoleWarnSpy: jest.SpyInstance;

	beforeAll(() => {
		consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
	});

	afterAll(() => {
		consoleWarnSpy.mockRestore();
	});

	it('returns true for identical primitive types', () => {
		const from: SchemaDefinition = { type: 'string' };
		const to: SchemaDefinition = { type: 'string' };
		expect(areSchemasCompatible(from, to)).toEqual({ compatible: true, errors: [] });
	});

	it('returns false for different types', () => {
		const from: SchemaDefinition = { type: 'string' };
		const to: SchemaDefinition = { type: 'object' };
		const { compatible, errors } = areSchemasCompatible(from, to);
		expect(compatible).toBe(false);
		expect(errors[0]).toMatch(/Schema of type 'string' cannot be assigned to 'object'/);
	});

	it('returns true for compatible arrays', () => {
		const from: SchemaDefinition = { type: 'array', items: { type: 'string' } };
		const to: SchemaDefinition = { type: 'array', items: { type: 'string' } };
		expect(areSchemasCompatible(from, to)).toEqual({ compatible: true, errors: [] });
	});

	it('returns false for incompatible array item types', () => {
		const from: SchemaDefinition = { type: 'array', items: { type: 'string' } };
		const to: SchemaDefinition = { type: 'array', items: { type: 'number' } };
		const result = areSchemasCompatible(from, to);
		expect(result.compatible).toBe(false);
		expect(result.errors[0]).toMatch(/Schema of type 'string' cannot be assigned to 'number'/);
	});

	it('returns true for compatible objects with required properties', () => {
		const from: SchemaDefinition = {
			type: 'object',
			properties: { foo: { type: 'string' }, bar: { type: 'number' } },
			required: ['foo', 'bar'],
			additionalProperties: false
		};
		const to: SchemaDefinition = {
			type: 'object',
			properties: { foo: { type: 'string' }, bar: { type: 'number' } },
			required: ['foo'],
			additionalProperties: false
		};
		expect(areSchemasCompatible(from, to)).toEqual({ compatible: true, errors: [] });

	});

	it('returns false if a required property is missing', () => {
		const from: SchemaDefinition = {
			type: 'object',
			properties: { foo: { type: 'string' } },
			required: ['foo'],
			additionalProperties: false
		};
		const to: SchemaDefinition = {
			type: 'object',
			properties: { foo: { type: 'string' }, bar: { type: 'number' } },
			required: ['foo', 'bar'],
			additionalProperties: false
		};
		const result = areSchemasCompatible(from, to);
		expect(result.compatible).toBe(false);
		expect(result.errors).toEqual([`test: Required property 'bar' is missing in the source schema's list of required properties`]);
	});

	it('returns true for objects with no required properties', () => {
		const from: SchemaDefinition = {
			type: 'object',
			properties: { oof: { type: 'integer' } },
		};
		const to: SchemaDefinition = {
			type: 'object',
			properties: { foo: { type: 'string' } },
		};
		expect(areSchemasCompatible(from, to).compatible).toBe(true);
	});

	it('returns true for objects with compatible properties', () => {
		const from: SchemaDefinition = {
			type: 'object',
			properties: { foo: { type: 'string' } },
		};
		const to: SchemaDefinition = {
			type: 'object',
			properties: { foo: { type: 'string' } },
		};
		expect(areSchemasCompatible(from, to)).toEqual({ compatible: true, errors: [] });
	});

	it('returns false for objects with incompatible properties', () => {
		const from: SchemaDefinition = {
			type: 'object',
			properties: { foo: { type: 'string' }, bar: { type: 'number' } },
		};
		const to: SchemaDefinition = {
			type: 'object',
			properties: { foo: { type: 'number' }, bar: { type: 'integer' } },
		};
		const result = areSchemasCompatible(from, to);
		expect(result.compatible).toBe(false);
		expect(result.errors).toEqual([
			`test.foo: Schema of type 'string' cannot be assigned to 'number'`,
			`test.bar: Schema of type 'number' cannot be assigned to 'integer'`
		]);
	});

	it('returns false for sources with extra properties in strict mode', () => {
		const from: SchemaDefinition = {
			type: 'object',
			required: ['foo'],
			properties: { foo: { type: 'string' }, bar: { type: 'number' } },
		};
		const to: SchemaDefinition = {
			type: 'object',
			properties: { foo: { type: 'string' } },
			required: ['foo'],
			additionalProperties: false
		};
		const result = areSchemasCompatible(from, to);
		expect(result.compatible).toBe(false);
		expect(result.errors).toEqual([`test: Source schema has properties not defined in the destination: bar`]);
	});
});

describe('parseComponentConfiguration', () => {
	it('should parse valid component configuration', () => {
		const validConfig = JSON.stringify({
			inputs: {
				text: { type: 'string' }
			},
			outputs: {
				result: { type: 'string' }
			},
			settings: { type: 'null' },
			code: {
				type: 'inline',
				source: 'return { result: values.text };'
			}
		});

		const result = parseComponentConfiguration(validConfig);

		expect(result).toEqual({
			inputs: {
				text: { type: 'string' }
			},
			outputs: {
				result: { type: 'string' }
			},
			settings: { type: 'null' },
			code: {
				type: 'inline',
				source: 'return { result: values.text };'
			}
		});
	});

	it('should parse component with complex schema definitions', () => {
		const validConfig = JSON.stringify({
			inputs: {
				data: { type: 'any' },
				items: {
					type: 'array',
					items: { type: 'string' }
				}
			},
			outputs: {
				processed: {
					type: 'object',
					properties: {
						count: { type: 'number' }
					},
					required: ['count']
				}
			},
			settings: {
				type: 'object',
				properties: {
					mode: { type: 'enum', enum: ['fast', 'slow'] }
				},
				required: ['mode']
			},
			code: {
				type: 'inline',
				source: 'return { processed: { count: values.items.length } };'
			}
		});

		const result = parseComponentConfiguration(validConfig);

		expect(result.inputs.data).toEqual({ type: 'any' });
		expect(result.inputs.items).toEqual({
			type: 'array',
			items: { type: 'string' }
		});
		expect(result.outputs.processed.type).toBe('object');
		expect(result.settings.type).toBe('object');
		expect(result.code).toEqual({
			type: 'inline',
			source: 'return { processed: { count: values.items.length } };'
		});
	});

	it('should throw error for invalid JSON', () => {
		const invalidJson = '{ invalid json }';

		expect(() => parseComponentConfiguration(invalidJson)).toThrow();
	});

	it('should throw error for missing required properties', () => {
		const invalidConfig = JSON.stringify({
			inputs: {
				text: { type: 'string' }
			},
			code: {
				type: 'inline',
				source: 'return {};'
			}
			// missing outputs and settings
		});

		expect(() => parseComponentConfiguration(invalidConfig)).toThrow(/Invalid schema definition/);
	});

	it('should throw error for invalid schema definition in inputs', () => {
		const invalidConfig = JSON.stringify({
			inputs: {
				text: { type: 'invalid-type' }  // invalid type
			},
			outputs: {
				result: { type: 'string' }
			},
			settings: { type: 'null' },
			code: {
				type: 'inline',
				source: 'return { result: values.text };'
			}
		});

		expect(() => parseComponentConfiguration(invalidConfig)).toThrow(/Invalid schema definition/);
	});

	it('should throw error for additional properties', () => {
		const invalidConfig = JSON.stringify({
			inputs: {
				text: { type: 'string' }
			},
			outputs: {
				result: { type: 'string' }
			},
			settings: { type: 'null' },
			code: {
				type: 'inline',
				source: 'return { result: values.text };'
			},
			extraProperty: 'not allowed'  // additional property not allowed
		});

		expect(() => parseComponentConfiguration(invalidConfig)).toThrow(/Invalid schema definition/);
	});

	it('should parse component with auto and any schema types', () => {
		const validConfig = JSON.stringify({
			inputs: {
				autoInput: { type: 'auto' },
				anyInput: { type: 'any' }
			},
			outputs: {
				autoOutput: { type: 'auto' }
			},
			settings: { type: 'null' },
			code: {
				type: 'inline',
				source: 'return { autoOutput: values.autoInput || values.anyInput };'
			}
		});

		const result = parseComponentConfiguration(validConfig);

		expect(result.inputs.autoInput).toEqual({ type: 'auto' });
		expect(result.inputs.anyInput).toEqual({ type: 'any' });
		expect(result.outputs.autoOutput).toEqual({ type: 'auto' });
		expect(result.code).toEqual({
			type: 'inline',
			source: 'return { autoOutput: values.autoInput || values.anyInput };'
		});
	});

	it('should throw error for missing code field', () => {
		const invalidConfig = JSON.stringify({
			inputs: {
				text: { type: 'string' }
			},
			outputs: {
				result: { type: 'string' }
			},
			settings: { type: 'null' }
			// missing required code field
		});

		expect(() => parseComponentConfiguration(invalidConfig)).toThrow(/Invalid schema definition/);
	});

	it('should throw error for invalid code type', () => {
		const invalidConfig = JSON.stringify({
			inputs: {
				text: { type: 'string' }
			},
			outputs: {
				result: { type: 'string' }
			},
			settings: { type: 'null' },
			code: {
				type: 'invalid-type',  // invalid code type
				source: 'return { result: values.text };'
			}
		});

		expect(() => parseComponentConfiguration(invalidConfig)).toThrow(/Invalid schema definition/);
	});

	it('should parse component with external code type', () => {
		const validConfig = JSON.stringify({
			inputs: {
				text: { type: 'string' }
			},
			outputs: {
				result: { type: 'string' }
			},
			settings: { type: 'null' },
			code: {
				type: 'external',
				source: 'https://example.com/component.js'
			}
		});

		const result = parseComponentConfiguration(validConfig);

		expect(result.code).toEqual({
			type: 'external',
			source: 'https://example.com/component.js'
		});
	});

	it('should parse component with flowchart code type', () => {
		const validConfig = JSON.stringify({
			inputs: {
				text: { type: 'string' }
			},
			outputs: {
				result: { type: 'string' }
			},
			settings: { type: 'null' },
			code: {
				type: 'flowchart',
				source: '...'
			}
		});

		const result = parseComponentConfiguration(validConfig);

		expect(result.code).toEqual({
			type: 'flowchart',
			source: '...'
		});
	});
});