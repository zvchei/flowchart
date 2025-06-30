import type { SchemaDefinition } from './schema.d';
import { Schema } from './schema';

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