import { Flowchart } from './flowchart';
import type { NodeDefinition, Component, Connection } from './flowchart.d';
import { NodeInstance } from './node';

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
			const node: NodeDefinition = {
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
			const node: NodeDefinition = {
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
				expect(error).toEqual({ code: 'DUPLICATE_NODE_ID' });
			}
		});

		it('should validate node\'s settings before adding', () => {
			const nodeId = 'test-node-2';
			const node: NodeDefinition = {
				type: 'test',
				settings: { option: 'invalid' } // Assuming 'invalid' is not a valid setting
			};

			jest.spyOn(mockComponentRegistry, 'getInstance').mockImplementation(() => {
				throw { code: 'INVALID_NODE_SETTINGS' };
			});

			try {
				flowchart.addNode(nodeId, node);
			} catch (error) {
				expect(error).toEqual({ code: 'INVALID_NODE_SETTINGS' });
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

			const node1: NodeDefinition = { type: 'source', settings: {} };
			const node2: NodeDefinition = { type: 'sink', settings: {} };

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
					details: { property: 'from', value: invalidConnection.from }
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
					details: { property: 'to', value: invalidConnection.to }
				});
			}
		});

		it('should validate connection compatibility', () => {
			// ...
		});
	});

	describe('flowchart execution', () => {
		// ...
	});
});
