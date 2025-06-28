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

describe('validateConnections', () => {
	const mockComponents: Record<string, Component> = {
		textProcessor: {
			inputs: {
				text: { type: 'string' }
			},
			outputs: {
				processedText: { type: 'string' }
			},
			settings: { type: 'null' },
			run: async () => ({})
		},
		numberProcessor: {
			inputs: {
				number: { type: 'number' }
			},
			outputs: {
				result: { type: 'number' }
			},
			settings: { type: 'null' },
			run: async () => ({})
		},
		printer: {
			inputs: {
				data: { type: 'any' }
			},
			outputs: {},
			settings: { type: 'null' },
			run: async () => ({})
		}
	};

	it('should return valid for correct connections', () => {
		const connections: FlowchartDefinition['connections'] = {
			conn1: {
				from: { node: 'textProcessor', connector: 'processedText' },
				to: { node: 'printer', connector: 'data' }
			}
		};

		const result = validateConnections(connections, mockComponents);
		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it('should return invalid when from node is not registered', () => {
		const connections: FlowchartDefinition['connections'] = {
			conn1: {
				from: { node: 'nonExistentNode', connector: 'output' },
				to: { node: 'printer', connector: 'data' }
			}
		};

		const result = validateConnections(connections, mockComponents);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Node with ID "nonExistentNode" is not registered.');
	});

	it('should return invalid when to node is not registered', () => {
		const connections: FlowchartDefinition['connections'] = {
			conn1: {
				from: { node: 'textProcessor', connector: 'processedText' },
				to: { node: 'nonExistentNode', connector: 'input' }
			}
		};

		const result = validateConnections(connections, mockComponents);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Node with ID "nonExistentNode" is not registered.');
	});

	it('should return invalid when from connector does not exist', () => {
		const connections: FlowchartDefinition['connections'] = {
			conn1: {
				from: { node: 'textProcessor', connector: 'nonExistentOutput' },
				to: { node: 'printer', connector: 'data' }
			}
		};

		const result = validateConnections(connections, mockComponents);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Output connector "nonExistentOutput" on node "textProcessor" is not defined.');
	});

	it('should return invalid when to connector does not exist', () => {
		const connections: FlowchartDefinition['connections'] = {
			conn1: {
				from: { node: 'textProcessor', connector: 'processedText' },
				to: { node: 'printer', connector: 'nonExistentInput' }
			}
		};

		const result = validateConnections(connections, mockComponents);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Input connector "nonExistentInput" on node "printer" is not defined.');
	});

	it('should return invalid when connector types are incompatible', () => {
		const connections: FlowchartDefinition['connections'] = {
			conn1: {
				from: { node: 'textProcessor', connector: 'processedText' },
				to: { node: 'numberProcessor', connector: 'number' }
			}
		};

		const result = validateConnections(connections, mockComponents);
		expect(result.valid).toBe(false);
		expect(result.errors[0]).toMatch(/Connection "conn1": Incompatible types: 'string' cannot be assigned to 'number'/);
	});

	it('should return valid when connecting to any type', () => {
		const connections: FlowchartDefinition['connections'] = {
			conn1: {
				from: { node: 'textProcessor', connector: 'processedText' },
				to: { node: 'printer', connector: 'data' }
			}
		};

		const result = validateConnections(connections, mockComponents);
		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it('should validate multiple connections', () => {
		const connections: FlowchartDefinition['connections'] = {
			conn1: {
				from: { node: 'textProcessor', connector: 'processedText' },
				to: { node: 'printer', connector: 'data' }
			},
			conn2: {
				from: { node: 'numberProcessor', connector: 'result' },
				to: { node: 'printer', connector: 'data' }
			}
		};

		const result = validateConnections(connections, mockComponents);
		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it('should return invalid with multiple connection errors', () => {
		const connections: FlowchartDefinition['connections'] = {
			conn1: {
				from: { node: 'textProcessor', connector: 'processedText' },
				to: { node: 'numberProcessor', connector: 'number' }
			},
			conn2: {
				from: { node: 'nonExistentNode', connector: 'output' },
				to: { node: 'printer', connector: 'data' }
			}
		};

		const result = validateConnections(connections, mockComponents);
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(2);
		expect(result.errors[0]).toMatch(/Connection "conn1": Incompatible types/);
		expect(result.errors[1]).toContain('Node with ID "nonExistentNode" is not registered.');
	});

	it('should handle complex object type compatibility', () => {
		const complexComponents: Record<string, Component> = {
			objectProducer: {
				inputs: {},
				outputs: {
					obj: {
						type: 'object',
						properties: {
							name: { type: 'string' },
							age: { type: 'number' }
						},
						required: ['name', 'age']
					}
				},
				settings: { type: 'null' },
				run: async () => ({})
			},
			objectConsumer: {
				inputs: {
					obj: {
						type: 'object',
						properties: {
							name: { type: 'string' }
						},
						required: ['name']
					}
				},
				outputs: {},
				settings: { type: 'null' },
				run: async () => ({})
			}
		};

		const connections: FlowchartDefinition['connections'] = {
			conn1: {
				from: { node: 'objectProducer', connector: 'obj' },
				to: { node: 'objectConsumer', connector: 'obj' }
			}
		};

		const result = validateConnections(connections, complexComponents);
		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it('should fail when object properties are incompatible', () => {
		const complexComponents: Record<string, Component> = {
			objectProducer: {
				inputs: {},
				outputs: {
					obj: {
						type: 'object',
						properties: {
							name: { type: 'string' },
							age: { type: 'number' }
						},
						required: ['name', 'age']
					}
				},
				settings: { type: 'null' },
				run: async () => ({})
			},
			objectConsumer: {
				inputs: {
					obj: {
						type: 'object',
						properties: {
							name: { type: 'string' },
							age: { type: 'string' } // Incompatible type
						},
						required: ['name']
					}
				},
				outputs: {},
				settings: { type: 'null' },
				run:	 async () => ({})
			}
		};

		const connections: FlowchartDefinition['connections'] = {
			conn1: {
				from: { node: 'objectProducer', connector: 'obj' },
				to: { node: 'objectConsumer', connector: 'obj' }
			}
		};

		const result = validateConnections(connections, complexComponents);
		expect(result.valid).toBe(false);
		expect(result.errors[0]).toMatch(/Connection "conn1": 'age': Incompatible types: 'number' cannot be assigned to 'string'/);
	});

	it('should fail when object has additional properties in strict mode', () => {
		const complexComponents: Record<string, Component> = {
			objectProducer: {
				inputs: {},
				outputs: {
					obj: {
						type: 'object',
						properties: {
							name: { type: 'string' },
							age: { type: 'number' }
						},
						required: ['name', 'age'],
						additionalProperties: false
					}
				},
				settings: { type: 'null' },
				run: async () => ({})
			},
			objectConsumer: {
				inputs: {
					obj: {
						type: 'object',
						properties: {
							name: { type: 'string' }
						},
						required: ['name'],
						additionalProperties: false
					}
				},
				outputs: {},
				settings: { type: 'null' },
				run: async () => ({})
			}
		};

		const connections: FlowchartDefinition['connections'] = {
			conn1: {
				from: { node: 'objectProducer', connector: 'obj' },
				to: { node: 'objectConsumer', connector: 'obj' }
			}
		};

		const result = validateConnections(connections, complexComponents);
		expect(result.valid).toBe(false);
		expect(result.errors[0]).toMatch(/Source schema has additional properties not defined in a strict destination schema/);
	});
});
