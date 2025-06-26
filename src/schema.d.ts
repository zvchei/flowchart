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

// TODO: Define enums