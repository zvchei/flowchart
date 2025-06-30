import type { Schema } from './schema.d';
import type { FlowchartDefinition, Component } from './flowchart.d';
import { areSchemasCompatible, validateConnections } from './schema';

describe('areSchemasCompatible', () => {
	let consoleWarnSpy: jest.SpyInstance;

	beforeAll(() => {
		consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
	});

	afterAll(() => {
		consoleWarnSpy.mockRestore();
	});

	it('returns true for identical primitive types', () => {
		const from: Schema = { type: 'string' };
		const to: Schema = { type: 'string' };
		expect(areSchemasCompatible(from, to)).toEqual({ compatible: true, errors: [] });
	});

	it('returns false for different types', () => {
		const from: Schema = { type: 'string' };
		const to: Schema = { type: 'object' };
		const { compatible, errors } = areSchemasCompatible(from, to);
		expect(compatible).toBe(false);
		expect(errors[0]).toMatch(/Incompatible types: 'string' cannot be assigned to 'object'/);
	});

	it('returns true for compatible arrays', () => {
		const from: Schema = { type: 'array', items: { type: 'string' } };
		const to: Schema = { type: 'array', items: { type: 'string' } };
		expect(areSchemasCompatible(from, to)).toEqual({ compatible: true, errors: [] });
	});

	it('returns false for incompatible array item types', () => {
		const from: Schema = { type: 'array', items: { type: 'string' } };
		const to: Schema = { type: 'array', items: { type: 'number' } };
		const result = areSchemasCompatible(from, to);
		expect(result.compatible).toBe(false);
		expect(result.errors[0]).toMatch(/Incompatible array item types/);
	});

	it('returns true for compatible objects with required properties', () => {
		const from: Schema = {
			type: 'object',
			properties: { foo: { type: 'string' }, bar: { type: 'number' } },
			required: ['foo', 'bar'],
			additionalProperties: false
		};
		const to: Schema = {
			type: 'object',
			properties: { foo: { type: 'string' }, bar: { type: 'number' } },
			required: ['foo'],
			additionalProperties: false
		};
		expect(areSchemasCompatible(from, to)).toEqual({ compatible: true, errors: [] });

	});

	it('returns false if a required property is missing', () => {
		const from: Schema = {
			type: 'object',
			properties: { foo: { type: 'string' } },
			required: ['foo'],
			additionalProperties: false
		};
		const to: Schema = {
			type: 'object',
			properties: { foo: { type: 'string' }, bar: { type: 'number' } },
			required: ['foo', 'bar'],
			additionalProperties: false
		};
		const result = areSchemasCompatible(from, to);
		expect(result.compatible).toBe(false);
		expect(result.errors).toEqual([`Required property 'bar' is missing in the source schema`]);
	});

	it('returns true for objects with no required properties', () => {
		const from: Schema = {
			type: 'object',
			properties: { oof: { type: 'integer' } },
		};
		const to: Schema = {
			type: 'object',
			properties: { foo: { type: 'string' } },
		};
		expect(areSchemasCompatible(from, to).compatible).toBe(true);
	});

	it('returns true for objects with compatible properties', () => {
		const from: Schema = {
			type: 'object',
			properties: { foo: { type: 'string' } },
		};
		const to: Schema = {
			type: 'object',
			properties: { foo: { type: 'string' } },
		};
		expect(areSchemasCompatible(from, to)).toEqual({ compatible: true, errors: [] });
	});

	it('returns false for objects with incompatible properties', () => {
		const from: Schema = {
			type: 'object',
			properties: { foo: { type: 'string' }, bar: { type: 'number' } },
		};
		const to: Schema = {
			type: 'object',
			properties: { foo: { type: 'number' }, bar: { type: 'integer' } },
		};
		const result = areSchemasCompatible(from, to);
		expect(result.compatible).toBe(false);
		expect(result.errors).toEqual([
			`'foo': Incompatible types: 'string' cannot be assigned to 'number'`,
			`'bar': Incompatible types: 'number' cannot be assigned to 'integer'`
		]);
	});

	it('returns false for sources with extra properties in strict mode', () => {
		const from: Schema = {
			type: 'object',
			required: ['foo'],
			properties: { foo: { type: 'string' }, bar: { type: 'number' } },
		};
		const to: Schema = {
			type: 'object',
			properties: { foo: { type: 'string' } },
			required: ['foo'],
			additionalProperties: false
		};
		const result = areSchemasCompatible(from, to);
		expect(result.compatible).toBe(false);
		expect(result.errors).toEqual([`Source schema has additional properties not defined in a strict destination schema`]);
	});
});