import type { JsonError } from "json-schema-library";

export type ArraySchemaDefinition = {
	type: 'array';
	items: SchemaDefinition;
};

export type TupleSchemaDefinition = {
	type: 'tuple';
	items: SchemaDefinition[];
};

export type EnumSchemaDefinition = {
	type: 'enum';
	enum: string[];
};

export type ObjectSchemaDefinition = {
	type: 'object';
	required?: string[];
	properties?: Record<string, SchemaDefinition>;
	additionalProperties?: false;
};

export type SchemaDefinition =
	| { type: 'auto' } // Auto schemas mirror the type from the other end of the connection.
	| { type: 'any' } // Not defined in the JSON Schema specification, but very convenient.
	| { type: 'string' | 'boolean' | 'null' | 'integer' | 'number' }
	| ArraySchemaDefinition
	| ObjectSchemaDefinition
	| TupleSchemaDefinition
	| EnumSchemaDefinition;


export type SchemaError = {
	locator: string;
	message: string;
}

export interface SchemaUtility {
	readonly definition: SchemaDefinition;
	checkCompatibilityWith(other: SchemaDefinition): { compatible: boolean; errors?: SchemaError[] };
	validate(value: any): { valid: boolean; errors?: JsonError[] };
}