import type { SchemaDefinition, ObjectSchemaDefinition } from './schema.d';

export type FlowchartDefinition = {
	nodes: Record<string, NodeDefinition>;
	connections: Record<string, Connection>;
};

export type NodeDefinition = {
	type: string;
	settings: any;
};

export interface Component {
	readonly inputs: Record<string, SchemaDefinition>;
	readonly outputs: Record<string, SchemaDefinition>;
	readonly settings: SchemaDefinition;
	run(values: Record<string, any>): Promise<Record<string, any> | void>;
}

export type Settings = ObjectSchemaDefinition & {
	required: ObjectSchemaDefinition['required'];
	properties: ObjectSchemaDefinition['properties'];
};

export type Connection = {
	from: Connector;
	to: Connector;
};

export type Connector = {
	node: string;
	connector: string;
};