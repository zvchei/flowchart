export type Flowchart = {
	nodes: Record<string, Node>;
	connections: Record<string, Connection>;
};

export type Node = {
	component: string;
	inputs: Record<string, ConnectorSchema>;
	outputs: Record<string, ConnectorSchema>;
	settings: Record<string, any>;
};

export type ConnectorSchema = Record<string, any>; // JSON schema of the data type of the connector

export type Connection = {
	from: Connector;
	to: Connector;
};

export type Connector = {
	node: string;
	connector: string;
};