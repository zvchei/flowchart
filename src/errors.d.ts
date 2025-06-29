export type FlowchartError = {
	code: keyof FLOWCHART_ERROR;
	details?: Array<{
		property: string;
		value: any;
	}>;
	errors?: Array<{
		message: string;
	}>;
}

export type NodeError = {
	code: NODE_ERROR;
	nodeId: string;
}

export type FLOWCHART_ERROR = {
	DUPLICATE_NODE_ID: 'DUPLICATE_NODE_ID',
	INVALID_NODE_SETTINGS: 'INVALID_NODE_SETTINGS',
	INVALID_CONNECTION_SETTINGS: 'INVALID_CONNECTION_SETTINGS',
	INVALID_FLOWCHART_SCHEMA: 'INVALID_FLOWCHART_SCHEMA',

}

export type NODE_ERROR = {
	// TODO: Define node-specific error codes
}