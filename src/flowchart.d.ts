import type { SchemaDefinition, ObjectSchemaDefinition } from './schema.d';

export type FlowchartDefinition = {
	components?: Record<string, Component>;
	nodes: Record<string, NodeConfiguration>;
	connections: Record<string, Connection>;
};

export type NodeConfiguration = {
	type: string;
	settings: any;
};

export interface Component {
	readonly inputs: Record<string, SchemaDefinition>;
	readonly outputs: Record<string, SchemaDefinition>;
	readonly settings: SchemaDefinition;
	readonly code: {
		type: 'inline' | 'external' | 'flowchart';
		source: string;
	};
}

export interface Runnable {
	(values: Record<string, any>, settings: Record<string, any>): Promise<Record<string, any> | void>;
}

export interface ComponentInstance {
	schema: Component;
	settings: Record<string, any>;
	runnable: Runnable;
}

export interface Node {
	readonly schema: {
		readonly inputs: Record<string, SchemaDefinition>;
		readonly outputs: Record<string, SchemaDefinition>;
	};
	input(name: string, data?: any): Promise<void>;
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