import { FlowchartError } from './errors.d';
import type { NodeDefinition, Component, Connection, FlowchartDefinition } from './flowchart.d';
import { NodeInstance, OutputSink } from './node';
import { compileSchema } from 'json-schema-library';
import * as flowchartSchema from './flowchart.schema.json';
import { areSchemasCompatible } from './schema';

interface ComponentRegistry {
	getInstance(nodeType: string, settings: any): Component;
}

export class Flowchart {
	private nodes: Record<string, NodeInstance> = {};
	private outputs: Record<string, Record<string, OutputSink[]>> = {};
	private outputSinks: Map<string, OutputSink> = new Map();

	constructor(
		private componentRegistry: ComponentRegistry
	) {
		// TODO: Implement flowchart construction logic
	}

	private validateConnection(id: string, { from, to }: Connection) {
		const source = this.nodes[from.node];
		const destination = this.nodes[to.node];

		let details: FlowchartError['details'] = [];

		if (!source) {
			details.push({ property: 'from.node', value: from.node });
		}

		if (!destination) {
			details.push({ property: 'to.node', value: to.node });
		}

		if (source && !source.schema.outputs[from.connector]) {
			details.push({ property: 'from.connector', value: from.connector });
		}

		if (destination && !destination.schema.inputs[to.connector]) {
			details.push({ property: 'to.connector', value: to.connector });
		}

		if (details.length > 0) {
			throw {
				code: 'INVALID_CONNECTION_SETTINGS',
				id,
				details
			} as FlowchartError;
		}

		const sourceSchema = source.schema.outputs[from.connector];
		const destSchema = destination.schema.inputs[to.connector];

		const { compatible, errors } = areSchemasCompatible(sourceSchema, destSchema);
		if (!compatible) {
			throw {
				code: 'INCOMPATIBLE_CONNECTORS',
				id,
				errors: errors.map(error => ({ message: error })),
			} as FlowchartError;
		}
	}

	static fromJson(componentRegistry: ComponentRegistry, flowchartData: FlowchartDefinition): Flowchart {
		// Validate the flowchart data against the schema
		const schema = compileSchema(flowchartSchema);
		const { valid, errors } = schema.validate(flowchartData);

		if (!valid) {
			throw {
				code: 'INVALID_FLOWCHART_SCHEMA',
				errors
			} as FlowchartError;
		}

		const flowchart = new Flowchart(componentRegistry);
		flowchart.loadFromDefinition(flowchartData);
		return flowchart;
	}

	private loadFromDefinition(flowchartData: FlowchartDefinition): void {
		for (const [nodeId, nodeDefinition] of Object.entries(flowchartData.nodes)) {
			this.addNode(nodeId, nodeDefinition);
		}

		for (const [connectionId, connection] of Object.entries(flowchartData.connections)) {
			this.addConnection(connectionId, connection);
		}
	}

	addNode(id: string, node: NodeDefinition): void {
		if (this.nodes[id]) {
			throw { code: 'DUPLICATE_NODE_ID', id } as FlowchartError;
		}

		const component = this.componentRegistry.getInstance(node.type, node.settings);
		if (!component) {
			throw {
				code: 'INVALID_NODE_SETTINGS',
				id,
				details: [{ property: 'type', value: node.type }]
			} as FlowchartError;
		}

		if (!this.outputs[id]) {
			this.outputs[id] = {};
		}

		const nodeInstance = new NodeInstance(id, component, this.outputs[id]);
		this.nodes[id] = nodeInstance;
	}

	getNode(nodeId: string): NodeInstance | undefined {
		return this.nodes[nodeId];
	}

	addConnection(id: string, { from, to }: Connection): void {
		this.validateConnection(id, { from, to });

		if (!this.outputs[from.node][from.connector]) {
			this.outputs[from.node][from.connector] = [];
		}

		const sink = async (value: any) => {
			await this.nodes[to.node].input(to.connector, value);
		};

		this.outputSinks.set(id, sink);
		this.outputs[from.node][from.connector].push(sink);
	}

	removeConnection(id: string): void {
		// ...
	}
}