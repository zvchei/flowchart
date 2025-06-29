export type ArraySchema = {
	type: 'array';
	items: {
		type: string;
	};
};

export type ObjectSchema = {
	type: 'object';
	required?: string[];
	properties?: Record<string, Schema>;
	additionalProperties?: false;
};

export type Schema =
| { type: 'any' } // Not defined in the JSON Schema specification, but very convenient.
| { type: 'string' | 'boolean' | 'null' | 'integer' | 'number' }
| ArraySchema
| ObjectSchema;

// TODO { type: 'auto' } for auto-mapping of types. Usefull for components that can handle multiple types, e.g. LLM
// powered components with structured input/output. Note: a connection cannot have both ends with type 'auto'.

// TODO: Define enums