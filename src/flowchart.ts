import { FlowchartError } from './errors.d';
import type { NodeDefinition, Component, Connection } from './flowchart.d';
import { NodeInstance, OutputSink } from './node';

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

    addNode(nodeId: string, node: NodeDefinition): void {
        if (this.nodes[nodeId]) {
            throw { code: 'DUPLICATE_NODE_ID' } as FlowchartError;
        }

        const component = this.componentRegistry.getInstance(node.type, node.settings);
        if (!component) {
            throw {
                code: 'INVALID_NODE_SETTINGS',
                details: { property: 'type', value: node.type }
            } as FlowchartError;
        }

        if (!this.outputs[nodeId]) {
            this.outputs[nodeId] = {};
        }

        const nodeInstance = new NodeInstance(nodeId, component, this.outputs[nodeId]);
        this.nodes[nodeId] = nodeInstance;
    }

    getNode(nodeId: string): NodeInstance | undefined {
        return this.nodes[nodeId];
    }

    addConnection(id: string, {from, to}: Connection): void {
        const source = this.nodes[from.node];
        const destination = this.nodes[to.node];

        if (!source) {
            throw {
                code: 'INVALID_CONNECTION_SETTINGS',
                details: { property: 'from', value: from }
            } as FlowchartError;
        }

        if (!destination) {
            throw {
                code: 'INVALID_CONNECTION_SETTINGS',
                details: { property: 'to', value: to }
            } as FlowchartError;
        }

        if (!this.outputs[from.node][from.connector]) {
            this.outputs[from.node][from.connector] = [];
        }

        const sink = async (value: any) => {
            await destination.input(to.connector, value);
        };

        this.outputSinks.set(id, sink);
        this.outputs[from.node][from.connector].push(sink);
    }

    removeConnection(id: string): void {
        // ...
    }
}