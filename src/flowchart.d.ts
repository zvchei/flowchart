import type { Schema, ObjectSchema } from './schema.d';

export type Flowchart = {
	nodes: Record<string, Node>;
	connections: Record<string, Connection>;
};

export type Node = {
	type: string;
	inputs: Record<string, Schema>;
	outputs: Record<string, Schema>;
	settings: Record<string, Schema>;
};

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