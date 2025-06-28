import type { Schema, ObjectSchema } from './schema.d';

export type FlowchartDefinition = {
	nodes: Record<string, NodeDefinition>;
	connections: Record<string, Connection>;
};

export type NodeDefinition = {
	type: string;
	settings: any;
};

export interface Component {
	readonly inputs: Record<string, Schema>;
	readonly outputs: Record<string, Schema>;
	readonly settings: Schema;
	run(values: Record<string, any>): Promise<Record<string, any> | void>;
}

export type Settings = ObjectSchema & {
	required: ObjectSchema['required'];
	properties: ObjectSchema['properties'];
};

export type Connection = {
	from: Connector;
	to: Connector;
};

export type Connector = {
	node: string;
	connector: string;
};