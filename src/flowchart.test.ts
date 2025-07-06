import { Flowchart } from './flowchart';
import type { NodeConfiguration, Component, Connection, FlowchartDefinition } from './flowchart.d';
import { NodeInstance } from './node';
import { FlowchartError } from './errors.d';

class MockComponentRegistry {
	getInstance(nodeType: string, settings: any): Component {
		throw new Error('Stub method, not implemented');
	}
}

describe('Flowchart', () => {
	let flowchart: Flowchart;
	let mockComponentRegistry: MockComponentRegistry;

	beforeEach(() => {
		mockComponentRegistry = new MockComponentRegistry();
		flowchart = new Flowchart(mockComponentRegistry);
	});

	describe('constructor', () => {
		it('can accept an optional flowchart definition', () => {
			// ...
		});
	});

	describe('getNode', () => {
		it('should return undefined for a non-existent node', () => {
			const nodeId = 'non-existent-node';
			const node = flowchart.getNode(nodeId);
			expect(node).toBeUndefined();
		});

		// Case 'return the correct node instance of an existing node' is handled in the addNode tests.
	});

	describe('addNode', () => {
		it('should add a new node to the flowchart', async () => {
			const nodeId = 'test-node-1';
			const node: NodeConfiguration = {
				type: 'test',
				settings: { option: 'value' }
			};

			const mockComponent: Component = {
				inputs: { input1: { type: 'string' } },
				outputs: {},
				settings: { type: 'object' },
				run: jest.fn().mockResolvedValue({})
			};

			const getInstanceSpy = jest.spyOn(mockComponentRegistry, 'getInstance').mockReturnValue(mockComponent);

			flowchart.addNode(nodeId, node);
			expect(getInstanceSpy).toHaveBeenCalledWith(node.type, node.settings);

			const nodeInstance = flowchart.getNode(nodeId);
			expect(nodeInstance instanceof NodeInstance).toBe(true);

			await nodeInstance!.input('input1', 'test data');
			expect(mockComponent.run).toHaveBeenCalledWith({ input1: 'test data' });
		});

		it('should prevent adding a node with duplicate ID', () => {
			const nodeId = 'test-node-1';
			const node: NodeConfiguration = {
				type: 'test',
				settings: { option: 'value' }
			};

			const mockComponent: Component = {
				inputs: { input1: { type: 'string' } },
				outputs: {},
				settings: { type: 'object' },
				run: jest.fn().mockResolvedValue({})
			};

			jest.spyOn(mockComponentRegistry, 'getInstance').mockReturnValue(mockComponent);
			flowchart.addNode(nodeId, node);

			try {
				flowchart.addNode(nodeId, node);
			} catch (error) {
				expect(error).toEqual({ code: 'DUPLICATE_NODE_ID', id: nodeId });
			}
		});

		it('should validate node\'s settings before adding', () => {
			const nodeId = 'test-node-2';
			const node: NodeConfiguration = {
				type: 'test',
				settings: { option: 'invalid' } // Assuming 'invalid' is not a valid setting
			};

			jest.spyOn(mockComponentRegistry, 'getInstance').mockReturnValue(null);

			try {
				flowchart.addNode(nodeId, node);
			} catch (error) {
				expect(error).toEqual({
					code: 'INVALID_NODE_SETTINGS',
					id: nodeId,
					details: [{ property: 'type', value: 'test' }]
				});
			}

			expect(flowchart.getNode(nodeId)).toBeUndefined();
		});
	});

	describe('adding connections at runtime', () => {
		let node1Component: Component;
		let node2Component: Component;

		beforeEach(() => {
			node1Component = {
				inputs: { input11: { type: 'string' } },
				outputs: { output11: { type: 'string' } },
				settings: { type: 'any' },
				run: jest.fn().mockResolvedValue({})
			};

			node2Component = {
				inputs: { input21: { type: 'string' } },
				outputs: {},
				settings: { type: 'any' },
				run: jest.fn().mockResolvedValue({})
			};

			jest.spyOn(mockComponentRegistry, 'getInstance').mockImplementation((type) => {
				if (type === 'source') return node1Component;
				if (type === 'sink') return node2Component;
				throw undefined;
			});

			const node1: NodeConfiguration = { type: 'source', settings: {} };
			const node2: NodeConfiguration = { type: 'sink', settings: {} };

			flowchart.addNode('node1', node1);
			flowchart.addNode('node2', node2);
		});

		it('should add a new connection between nodes', async () => {
			const connection: Connection = {
				from: { node: 'node1', connector: 'output11' },
				to: { node: 'node2', connector: 'input21' }
			};

			flowchart.addConnection('connection1', connection);

			const node1RunSpy = jest.spyOn(node1Component, 'run').mockResolvedValue({ output11: 'test data 2' });
			const node2RunSpy = jest.spyOn(node2Component, 'run').mockResolvedValue({});

			const node1 = flowchart.getNode('node1')!;
			await node1.input('input11', 'test data 1');

			expect(node1RunSpy).toHaveBeenCalledWith({ input11: 'test data 1' });
			expect(node2RunSpy).toHaveBeenCalledWith({ input21: 'test data 2' });
		});

		it('should throw an error for invalid connection settings', () => {
			const invalidConnection: Connection = {
				from: { node: 'non-existent-node', connector: 'output11' },
				to: { node: 'node2', connector: 'input21' }
			};

			try {
				flowchart.addConnection('invalid-connection', invalidConnection);
			} catch (error) {
				expect(error).toEqual({
					code: 'INVALID_CONNECTION_SETTINGS',
					id: 'invalid-connection',
					details: [{ property: 'from.node', value: invalidConnection.from.node }]
				});
			}
		});

		it('should throw an error for non-existent destination node', () => {
			const invalidConnection: Connection = {
				from: { node: 'node1', connector: 'output11' },
				to: { node: 'non-existent-node', connector: 'input21' }
			};

			try {
				flowchart.addConnection('invalid-connection', invalidConnection);
			} catch (error) {
				expect(error).toEqual({
					code: 'INVALID_CONNECTION_SETTINGS',
					id: 'invalid-connection',
					details: [{ property: 'to.node', value: invalidConnection.to.node }]
				});
			}
		});

		it('should throw an error for non-existent source connector', () => {
			const invalidConnection: Connection = {
				from: { node: 'node1', connector: 'non-existent-connector' },
				to: { node: 'node2', connector: 'input21' }
			};

			try {
				flowchart.addConnection('invalid-connection', invalidConnection);
			} catch (error) {
				expect(error).toEqual({
					code: 'INVALID_CONNECTION_SETTINGS',
					id: 'invalid-connection',
					details: [{ property: 'from.connector', value: 'non-existent-connector' }]
				});
			}
		});

		it('should throw an error for non-existent destination connector', () => {
			const invalidConnection: Connection = {
				from: { node: 'node1', connector: 'output11' },
				to: { node: 'node2', connector: 'non-existent-connector' }
			};

			try {
				flowchart.addConnection('invalid-connection', invalidConnection);
			} catch (error) {
				expect(error).toEqual({
					code: 'INVALID_CONNECTION_SETTINGS',
					id: 'invalid-connection',
					details: [{ property: 'to.connector', value: 'non-existent-connector' }]
				});
			}
		});

		it('should throw INCOMPATIBLE_CONNECTORS error for schema incompatibility', () => {
			// Create components with incompatible schemas
			const stringOutputComponent: Component = {
				inputs: { input11: { type: 'string' } },
				outputs: { output11: { type: 'string' } },
				settings: { type: 'any' },
				run: jest.fn().mockResolvedValue({})
			};

			const numberInputComponent: Component = {
				inputs: { input21: { type: 'number' } },
				outputs: {},
				settings: { type: 'any' },
				run: jest.fn().mockResolvedValue({})
			};

			jest.spyOn(mockComponentRegistry, 'getInstance').mockImplementation((type) => {
				if (type === 'string-output') return stringOutputComponent;
				if (type === 'number-input') return numberInputComponent;
				throw undefined;
			});

			const stringOutputNode: NodeConfiguration = { type: 'string-output', settings: {} };
			const numberInputNode: NodeConfiguration = { type: 'number-input', settings: {} };

			flowchart.addNode('string-output-1', stringOutputNode);
			flowchart.addNode('number-input-1', numberInputNode);

			const incompatibleConnection: Connection = {
				from: { node: 'string-output-1', connector: 'output11' },
				to: { node: 'number-input-1', connector: 'input21' }
			};

			try {
				flowchart.addConnection('incompatible-connection', incompatibleConnection);
			} catch (error) {
				expect(error).toEqual({
					code: 'INCOMPATIBLE_CONNECTORS',
					id: 'incompatible-connection',
					errors: [{
						message: "string-output-1.outputs[output11]: Schema of type 'string' cannot be assigned to 'number'"
					}]
				});
			}
		});
	});

	describe('flowchart execution', () => {
		// ...
	});

	describe('fromJson', () => {
		it('should create a flowchart from JSON definition and execute correctly', async () => {
			const doublerComponent: Component = {
				inputs: { number: { type: 'number' } },
				outputs: { result: { type: 'number' } },
				settings: { type: 'object' },
				run: jest.fn().mockImplementation((values) => {
					return Promise.resolve({ result: values.number * 2 });
				})
			};

			const printerComponent: Component = {
				inputs: { value: { type: 'number' } },
				outputs: {},
				settings: { type: 'object' },
				run: jest.fn().mockResolvedValue({})
			};

			jest.spyOn(mockComponentRegistry, 'getInstance').mockImplementation((type) => {
				if (type === 'doubler') return doublerComponent;
				if (type === 'printer') return printerComponent;
				throw new Error(`Unknown type: ${type}`);
			});

			const flowchartData = {
				nodes: {
					'doubler1': { type: 'doubler', settings: {} },
					'printer1': { type: 'printer', settings: {} }
				},
				connections: {
					'conn1': {
						from: { node: 'doubler1', connector: 'result' },
						to: { node: 'printer1', connector: 'value' }
					}
				}
			};

			const flowchart = Flowchart.fromJson(mockComponentRegistry, flowchartData);

			expect(flowchart.getNode('doubler1')).toBeDefined();
			expect(flowchart.getNode('printer1')).toBeDefined();

			const doublerNode = flowchart.getNode('doubler1')!;
			await doublerNode.input('number', 5);

			expect(doublerComponent.run).toHaveBeenCalledWith({ number: 5 });
			expect(printerComponent.run).toHaveBeenCalledWith({ value: 10 });
		});

		it('should validate valid flowchart schema', () => {
			const validFlowchartData: FlowchartDefinition = {
				nodes: {
					'node1': { type: 'test', settings: {} }
				},
				connections: {
					'conn1': {
						from: { node: 'node1', connector: 'output1' },
						to: { node: 'node1', connector: 'input1' }
					}
				}
			};

			const mockComponent: Component = {
				inputs: { input1: { type: 'string' } },
				outputs: { output1: { type: 'string' } },
				settings: { type: 'object' },
				run: jest.fn().mockResolvedValue({})
			};

			jest.spyOn(mockComponentRegistry, 'getInstance').mockReturnValue(mockComponent);

			expect(() => {
				Flowchart.fromJson(mockComponentRegistry, validFlowchartData);
			}).not.toThrow();
		});

		it('should throw INVALID_FLOWCHART_SCHEMA error for missing required fields', () => {
			const invalidFlowchartData = {
				nodes: {
					'node1': { type: 'test', settings: {} }
				}
				// Missing required 'connections' field
			} as any;

			expect(() => {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			}).toThrow();

			try {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			} catch (error) {
				expect(error).toEqual({
					code: 'INVALID_FLOWCHART_SCHEMA',
					errors: expect.any(Array)
				} as FlowchartError);
			}
		});

		it('should throw INVALID_FLOWCHART_SCHEMA error for invalid node structure', () => {
			const invalidFlowchartData = {
				nodes: {
					'node1': {
						// Missing required 'type' field
						settings: {}
					}
				},
				connections: {}
			} as any;

			expect(() => {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			}).toThrow();

			try {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			} catch (error) {
				expect(error).toEqual({
					code: 'INVALID_FLOWCHART_SCHEMA',
					errors: expect.any(Array)
				} as FlowchartError);
			}
		});

		it('should throw INVALID_FLOWCHART_SCHEMA error for invalid connection structure', () => {
			const invalidFlowchartData = {
				nodes: {
					'node1': { type: 'test', settings: {} }
				},
				connections: {
					'conn1': {
						from: { node: 'node1', connector: 'output1' }
						// Missing required 'to' field
					}
				}
			} as any;

			expect(() => {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			}).toThrow();

			try {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			} catch (error) {
				expect(error).toEqual({
					code: 'INVALID_FLOWCHART_SCHEMA',
					errors: expect.any(Array)
				} as FlowchartError);
			}
		});

		it('should throw INVALID_FLOWCHART_SCHEMA error for invalid connector structure', () => {
			const invalidFlowchartData = {
				nodes: {
					'node1': { type: 'test', settings: {} }
				},
				connections: {
					'conn1': {
						from: {
							node: 'node1'
							// Missing required 'connector' field
						},
						to: { node: 'node1', connector: 'input1' }
					}
				}
			} as any;

			expect(() => {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			}).toThrow();

			try {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			} catch (error) {
				expect(error).toEqual({
					code: 'INVALID_FLOWCHART_SCHEMA',
					errors: expect.any(Array)
				} as FlowchartError);
			}
		});

		it('should throw INVALID_FLOWCHART_SCHEMA error for additional properties', () => {
			const invalidFlowchartData = {
				nodes: {
					'node1': { type: 'test', settings: {} }
				},
				connections: {},
				invalidProperty: 'should not be allowed'
			} as any;

			expect(() => {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			}).toThrow();

			try {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			} catch (error) {
				expect(error).toEqual({
					code: 'INVALID_FLOWCHART_SCHEMA',
					errors: expect.any(Array)
				} as FlowchartError);
			}
		});

		it('should throw INVALID_FLOWCHART_SCHEMA error for invalid data types', () => {
			const invalidFlowchartData = {
				nodes: {
					'node1': {
						type: 123, // Should be string
						settings: {}
					}
				},
				connections: {}
			} as any;

			expect(() => {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			}).toThrow();

			try {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			} catch (error) {
				expect(error).toEqual({
					code: 'INVALID_FLOWCHART_SCHEMA',
					errors: expect.any(Array)
				} as FlowchartError);
			}
		});

		it('should include validation errors in the thrown error', () => {
			const invalidFlowchartData = {
				nodes: {
					'node1': {
						// Missing required 'type' field
						settings: {}
					}
				},
				connections: {}
			} as any;

			expect(() => {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			}).toThrow();

			try {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			} catch (error) {
				expect(error).toEqual({
					code: 'INVALID_FLOWCHART_SCHEMA',
					errors: expect.any(Array)
				} as FlowchartError);
				expect((error as FlowchartError).errors!.length).toBeGreaterThan(0);
			}
		});

		it('should validate empty nodes and connections objects', () => {
			const validFlowchartData: FlowchartDefinition = {
				nodes: {},
				connections: {}
			};

			expect(() => {
				Flowchart.fromJson(mockComponentRegistry, validFlowchartData);
			}).not.toThrow();
		});

		it('should validate multiple nodes and connections', () => {
			const validFlowchartData: FlowchartDefinition = {
				nodes: {
					'node1': { type: 'source', settings: { value: 'test' } },
					'node2': { type: 'processor', settings: {} },
					'node3': { type: 'sink', settings: { destination: 'output' } }
				},
				connections: {
					'conn1': {
						from: { node: 'node1', connector: 'output' },
						to: { node: 'node2', connector: 'input' }
					},
					'conn2': {
						from: { node: 'node2', connector: 'output' },
						to: { node: 'node3', connector: 'input' }
					}
				}
			};

			const mockComponent: Component = {
				inputs: { input: { type: 'string' } },
				outputs: { output: { type: 'string' } },
				settings: { type: 'object' },
				run: jest.fn().mockResolvedValue({})
			};

			jest.spyOn(mockComponentRegistry, 'getInstance').mockReturnValue(mockComponent);

			expect(() => {
				Flowchart.fromJson(mockComponentRegistry, validFlowchartData);
			}).not.toThrow();
		});

		it('should throw INVALID_FLOWCHART_SCHEMA error for invalid node additional properties', () => {
			const invalidFlowchartData = {
				nodes: {
					'node1': {
						type: 'test',
						settings: {},
						invalidNodeProperty: 'not allowed'
					}
				},
				connections: {}
			} as any;

			expect(() => {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			}).toThrow();

			try {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			} catch (error) {
				expect(error).toEqual({
					code: 'INVALID_FLOWCHART_SCHEMA',
					errors: expect.any(Array)
				} as FlowchartError);
			}
		});

		it('should throw INVALID_FLOWCHART_SCHEMA error for invalid connection additional properties', () => {
			const invalidFlowchartData = {
				nodes: {
					'node1': { type: 'test', settings: {} }
				},
				connections: {
					'conn1': {
						from: { node: 'node1', connector: 'output1' },
						to: { node: 'node1', connector: 'input1' },
						invalidConnectionProperty: 'not allowed'
					}
				}
			} as any;

			expect(() => {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			}).toThrow();

			try {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			} catch (error) {
				expect(error).toEqual({
					code: 'INVALID_FLOWCHART_SCHEMA',
					errors: expect.any(Array)
				} as FlowchartError);
			}
		});

		it('should throw INVALID_FLOWCHART_SCHEMA error for invalid connector additional properties', () => {
			const invalidFlowchartData = {
				nodes: {
					'node1': { type: 'test', settings: {} }
				},
				connections: {
					'conn1': {
						from: {
							node: 'node1',
							connector: 'output1',
							invalidConnectorProperty: 'not allowed'
						},
						to: { node: 'node1', connector: 'input1' }
					}
				}
			} as any;

			expect(() => {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			}).toThrow();

			try {
				Flowchart.fromJson(mockComponentRegistry, invalidFlowchartData);
			} catch (error) {
				expect(error).toEqual({
					code: 'INVALID_FLOWCHART_SCHEMA',
					errors: expect.any(Array)
				} as FlowchartError);
			}
		});
	});

});
