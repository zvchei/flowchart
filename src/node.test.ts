import { NodeInstance, OutputSink } from './node';
import type { Component } from './flowchart.d';
import { Schema } from './schema.d';

class MockComponent implements Component {
	constructor(private mockImplementation?: (values: Record<string, any>) => Promise<Record<string, any>>) { }

	inputs: Record<string, Schema> = {
		input1: { type: 'string' },
		input2: { type: 'string' }
	};

	outputs: Record<string, Schema> = {
		result1: { type: 'string' },
		result2: { type: 'string' }
	};

	settings: Schema = {
		type: 'object',
		properties: {
			setting1: { type: 'string' }
		},
		required: ['setting1']
	};

	async run(values: Record<string, any>): Promise<Record<string, any>> {
		if (this.mockImplementation) {
			return await this.mockImplementation(values);
		}
		return Promise.resolve({ result1: 'result output 1', result2: 'result output 2' });
	}
}

describe('NodeInstance', () => {
	let mockComponent: MockComponent;
	let mockSink1: jest.MockedFunction<OutputSink>;
	let mockSink2: jest.MockedFunction<OutputSink>;
	let consoleWarnSpy: jest.SpyInstance;

	beforeEach(() => {
		mockComponent = new MockComponent();
		mockSink1 = jest.fn().mockImplementation((value) => Promise.resolve());
		mockSink2 = jest.fn().mockImplementation((value) => Promise.resolve());
		consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
	});

	afterEach(() => {
		jest.clearAllMocks();
		consoleWarnSpy.mockRestore();
	});

	describe('constructor', () => {
		it('should create a NodeInstance object with correct parameters', () => {
			const instance = new NodeInstance(
				'test-node',
				mockComponent,
				{ result1: [mockSink1] }
			);

			expect(instance).toBeInstanceOf(NodeInstance);
		});
	});

	describe('input', () => {
		it('should merge the input data and pass it to the node instance', async () => {
			const mockRun = jest.fn().mockResolvedValue({ result1: 'processed data' });
			mockComponent = new MockComponent(mockRun);

			const instance = new NodeInstance(
				'test-node',
				mockComponent,
				{ result1: [mockSink1] }
			);

			// First input should not trigger node execution.
			instance.input('input1', 'value1');
			await new Promise(resolve => setImmediate(resolve)); // Clear the event loop.
			expect(mockRun).not.toHaveBeenCalled();

			// Second input should trigger node execution.
			await instance.input('input2', 'value2');
			expect(mockRun).toHaveBeenCalledWith({
				input1: 'value1',
				input2: 'value2'
			});
		});

		it('should pass result to multiple sinks for the same output', async () => {
			const mockRun = jest.fn().mockResolvedValue({ result1: 'processed data' });
			mockComponent = new MockComponent(mockRun);

			const instance = new NodeInstance(
				'test-node',
				mockComponent,
				{ result1: [mockSink1, mockSink2] }
			);

			instance.input('input2', 'value2');
			instance.input('input1', 'value1');

			await new Promise(resolve => setImmediate(resolve)); // Clear the event loop.

			// Both sinks should receive the same result.
			expect(mockSink1).toHaveBeenCalledWith('processed data');
			expect(mockSink2).toHaveBeenCalledWith('processed data');
			expect(mockSink1).toHaveBeenCalledTimes(1);
			expect(mockSink2).toHaveBeenCalledTimes(1);
		});

		it('should separate the result and pass it to the sinks', async () => {
			const mockRun = jest.fn().mockResolvedValue({
				result1: 'foo',
				result2: 'bar',
			});
			mockComponent = new MockComponent(mockRun);

			const instance = new NodeInstance(
				'test-node',
				mockComponent,
				{
					result1: [mockSink1],
					result2: [mockSink2],
				}
			);

			// Provide both inputs to trigger execution.
			instance.input('input1', 'value1');
			instance.input('input2', 'value2');

			await new Promise(resolve => setImmediate(resolve)); // Clear the event loop.

			// Each sink should receive only its respective result.
			expect(mockSink1).toHaveBeenCalledWith('foo');
			expect(mockSink2).toHaveBeenCalledWith('bar');
			expect(mockSink1).toHaveBeenCalledTimes(1);
			expect(mockSink2).toHaveBeenCalledTimes(1);
		});

		it('should handle empty node result', async () => {
			const mockRun = jest.fn().mockResolvedValue(undefined);
			mockComponent = new MockComponent(mockRun);

			const instance = new NodeInstance(
				'test-node',
				mockComponent,
				{ result1: [mockSink1], result2: [mockSink2] }
			);

			instance.input('input1', 'value1');
			instance.input('input2', 'value2');
			await new Promise(resolve => setImmediate(resolve)); // Clear the event loop.

			// Sinks should not be called since there are no results.
			expect(mockSink1).not.toHaveBeenCalled();
			expect(mockSink2).not.toHaveBeenCalled();
		});

		it('should handle multiple inputs for the same field', async () => {
			const mockRun = jest.fn().mockResolvedValue({ result1: 'processed data' });
			mockComponent = new MockComponent(mockRun);

			const instance = new NodeInstance(
				'test-node',
				mockComponent,
				{ result1: [mockSink1] }
			);

			const firstInput1Promise = instance.input('input1', 'first value1');
			const secondInput1Promise = instance.input('input1', 'second value1');

			let secondInput1Resolved = false;
			secondInput1Promise.then(() => { secondInput1Resolved = true; });

			// When the second input to resolves, then the first input will resolve too.
			await instance.input('input2', 'value2');
			await firstInput1Promise;

			// The second input should not have resolved yet.
			expect(secondInput1Resolved).toBe(false);

			expect(mockRun).toHaveBeenCalledTimes(1);
			expect(mockRun).toHaveBeenCalledWith({
				input1: 'first value1',
				input2: 'value2'
			});

			await new Promise(resolve => setImmediate(resolve)); // Clear event loop.
			// The second should not have resolved yet.
			expect(secondInput1Resolved).toBe(false);
		});

		it('should handle null and undefined input data', async () => {
			const mockRun = jest.fn().mockResolvedValue({ result1: 'processed data' });
			mockComponent = new MockComponent(mockRun);

			const instance = new NodeInstance(
				'test-node',
				mockComponent,
				{ result1: [mockSink1] }
			);

			instance.input('input1', null);
			instance.input('input2', undefined);
			await new Promise(resolve => setImmediate(resolve)); // Clear the event loop.

			expect(mockRun).toHaveBeenCalledWith({
				input1: null,
				input2: undefined
			});

			expect(mockSink1).toHaveBeenCalledWith('processed data');
		});

		it('should handle nodes with no outputs configured', async () => {
			const mockRun = jest.fn().mockResolvedValue({ result1: 'processed data', result2: 'more data' });
			mockComponent = new MockComponent(mockRun);

			const instance = new NodeInstance(
				'test-node',
				mockComponent,
				{} // No outputs configured
			);

			instance.input('input1', 'value1');
			instance.input('input2', 'value2');
			await new Promise(resolve => setImmediate(resolve)); // Clear the event loop.

			// Node should execute normally.
			expect(mockRun).toHaveBeenCalledWith({
				input1: 'value1',
				input2: 'value2'
			});

			// Since no outputs are configured, console.warn should be called for each result.
			expect(consoleWarnSpy).toHaveBeenCalledWith('Node test-node produced unhandled output: result1');
			expect(consoleWarnSpy).toHaveBeenCalledWith('Node test-node produced unhandled output: result2');
		});

		it('should gracefully handle nodes with no outputs configured and no results from the run instance', async () => {
			const mockRun = jest.fn().mockResolvedValue({});
			mockComponent = new MockComponent(mockRun);

			const instance = new NodeInstance(
				'test-node',
				mockComponent,
				{} // No outputs configured.
			);

			instance.input('input1', 'value1');
			instance.input('input2', 'value2');
			await new Promise(resolve => setImmediate(resolve)); // Clear the event loop.

			// Node should execute normally.
			expect(mockRun).toHaveBeenCalledWith({
				input1: 'value1',
				input2: 'value2'
			});

			// Since no outputs are configured and no results were produced, no warnings should be logged.
			expect(consoleWarnSpy).not.toHaveBeenCalled();
		});

		it('should handle re-execution after completion', async () => {
			const mockRun = jest.fn().mockResolvedValue({ result1: 'processed data' });
			mockComponent = new MockComponent(mockRun);

			const instance = new NodeInstance(
				'test-node',
				mockComponent,
				{ result1: [mockSink1] }
			);

			instance.input('input1', 'value1');
			instance.input('input2', 'value2');
			await new Promise(resolve => setImmediate(resolve)); // Clear the event loop.

			// Node should execute normally.
			expect(mockRun).toHaveBeenCalledWith({
				input1: 'value1',
				input2: 'value2'
			});

			// Simulate re-execution.
			instance.input('input1', 'new value1');
			instance.input('input2', 'new value2');
			await new Promise(resolve => setImmediate(resolve)); // Clear the event loop.

			// Node should execute with new values.
			expect(mockRun).toHaveBeenCalledWith({
				input1: 'new value1',
				input2: 'new value2'
			});
		});

		it('should handle complex data structures', async () => {
			const complexInput1 = {
				nested: { value: 42, array: [1, 2, 3] },
				date: new Date('2025-01-01'),
				func: () => 'test'
			};
			const complexInput2 = ['string', { key: 'value' }, null, undefined, 123];
			const complexOutput = {
				result1: { processed: true, data: complexInput1 },
				result2: { count: complexInput2.length, items: complexInput2 }
			};

			const mockRun = jest.fn().mockResolvedValue(complexOutput);
			mockComponent = new MockComponent(mockRun);

			const instance = new NodeInstance(
				'test-node',
				mockComponent,
				{
					result1: [mockSink1],
					result2: [mockSink2]
				}
			);

			instance.input('input1', complexInput1);
			instance.input('input2', complexInput2);
			await new Promise(resolve => setImmediate(resolve)); // Clear the event loop.

			// Node should receive complex data structures as-is.
			expect(mockRun).toHaveBeenCalledWith({
				input1: complexInput1,
				input2: complexInput2
			});

			// Sinks should receive complex output structures.
			expect(mockSink1).toHaveBeenCalledWith(complexOutput.result1);
			expect(mockSink2).toHaveBeenCalledWith(complexOutput.result2);
		});
	});
});