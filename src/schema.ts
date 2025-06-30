import { compileSchema, type JsonError } from 'json-schema-library';
import type {
	EnumSchemaDefinition, ObjectSchemaDefinition, SchemaDefinition, SchemaError, SchemaUtility, TupleSchemaDefinition
} from './schema.d';

export class Schema implements SchemaUtility {
	constructor(readonly definition: SchemaDefinition, private readonly locator: string) { }

	/**
	 * Checks if the current schema is compatible with another schema to form a valid connection where the current
	 * schema is the source and the other schema is the destination.
	 *
	 * @param other The destination schema that will eventually receive values conforming to the current schema.
	 * @returns An object indicating whether the schemas are compatible and any errors found.
	 */
	checkCompatibilityWith(other: SchemaDefinition): { compatible: boolean; errors?: SchemaError[] } {
		const locator = this.locator;

		if (this.definition.type === 'auto' && other.type === 'auto') {
			return {
				compatible: false,
				errors: [{ locator, message: 'Only one of the schemas can be of type \'auto\'' }]
			};
		}

		// Schemas of type 'any' are always compatible with any other schema.
		if (other.type === 'any') {
			return { compatible: true };
		}

		if (this.definition.type !== other.type) {
			return {
				compatible: false,
				errors: [{
					locator,
					message: `Schema of type '${this.definition.type}' cannot be assigned to '${other.type}'`
				}]
			};
		}

		// Note: the conditions below are also used as a type guard.

		if (this.definition.type === 'array' && other.type === 'array') {
			return Schema.from(this.definition.items, `${locator}.items`).checkCompatibilityWith(other.items);
		}

		if (this.definition.type === 'tuple' && other.type === 'tuple') {
			return areTuplesCompatible(this.definition, other, locator);
		}

		if (this.definition.type === 'enum' && other.type === 'enum') {
			return areEnumsCompatible(this.definition, other, locator);
		}

		if (this.definition.type === 'object' && other.type === 'object') {
			return areObjectsCompatible(this.definition, other, locator);
		}

		return { compatible: true };
	}

	validate(value: any): { valid: boolean; errors?: JsonError[] } {
		const schema = compileSchema(this.definition);
		return schema.validate(value);
	}

	static from(definition: SchemaDefinition, locator: string): Schema {
		return new this(definition, locator);
	}
}

function areTuplesCompatible(source: TupleSchemaDefinition, destination: TupleSchemaDefinition, locator: string)
	: { compatible: boolean; errors?: SchemaError[] } {

	if (source.items.length !== destination.items.length) {
		return {
			compatible: false,
			errors: [{ locator, message: 'Tuples have different lengths' }]
		};
	}

	const errors = source.items.reduce((errors, item, index) => {
		const { compatible, errors: itemErrors } = (
			Schema.from(item, `${locator}[${index}]`).checkCompatibilityWith(destination.items[index])
		);

		if (!compatible) {
			return errors.concat(itemErrors);
		}

		return errors;
	}, []);

	return { compatible: errors.length === 0, errors };
}

function areEnumsCompatible(source: EnumSchemaDefinition, destination: EnumSchemaDefinition, locator: string)
	: { compatible: boolean; errors?: SchemaError[] } {

	const sourceSet = new Set(source.enum);
	const destinationSet = new Set(destination.enum);

	const errors = Array.from(sourceSet).reduce((errors, value) => {
		if (!destinationSet.has(value)) {
			return errors.concat({ locator, message: `Enum value '${value}' is not present in the destination schema` });
		}
		return errors;
	}, []);

	return { compatible: errors.length === 0, errors };
}

function areObjectsCompatible(source: ObjectSchemaDefinition, destination: ObjectSchemaDefinition, locator: string)
	: { compatible: boolean; errors?: SchemaError[] } {

	const errors: SchemaError[] = [];

	if (
		!destination.properties &&
		destination.additionalProperties === false &&
		Object.keys(source.properties ?? {}).length > 0
	) {
		return {
			compatible: false,
			errors: [{
				locator,
				message: 'The destination schema matches only empty object, but the source defines some properties'
			}]
		};
	}

	if (destination.required) {
		for (const name of destination.required) {
			if (!source.required?.includes(name)) {
				errors.push({
					locator,
					message: `Required property '${name}' is missing in the source schema's list of required properties`
				});
			}
		}
	}

	if (destination.additionalProperties === false) {
		const sourceProperties = Object.keys(source.properties ?? {});
		const destinationProperties = Object.keys(destination.properties ?? {});

		if (sourceProperties.length > destinationProperties.length) {
			const extraProperties = sourceProperties.filter(property => !destinationProperties.includes(property));
			errors.push({
				locator,
				message: `Source schema has properties not defined in the destination: ${extraProperties.join(', ')}`
			});
		}
	}

	for (const destinationProperty of Object.keys(destination.properties ?? {})) {
		if (
			destination.required?.includes(destinationProperty) &&
			source.required?.includes(destinationProperty)
		) {
			// Technically, this check is redundant, because a required property should be present in the source schema.
			// But it is a good sanity check in case the source schema is not properly defined.
			if (destinationProperty in (source.properties ?? {}) === false) {
				errors.push({
					locator,
					message: `Required property '${destinationProperty}' is missing in the source schema`
				});
			}
		}

		if (destinationProperty in (source.properties ?? {})) {
			const sourcePropertySchema = source.properties[destinationProperty];
			const destinationPropertySchema = destination.properties[destinationProperty];
			const schema = Schema.from(sourcePropertySchema, `${locator}.${destinationProperty}`);
			const { compatible, errors: propertyErrors } = schema.checkCompatibilityWith(destinationPropertySchema);

			if (!compatible) {
				errors.push(...propertyErrors);
			}
		}
	}

	return { compatible: errors.length === 0, errors };
}