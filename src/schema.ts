/**
 * Checks if the schemas are compatible.
 * Guarantees that a value conforming to the source schema can be assigned to a variable conforming to the destination schema.
 * @param from The source schema.
 * @param to The destination schema.
 * @returns An object indicating if the schemas are compatible and a list of errors if any.
*/
import type { Schema } from './schema.d';
import type { FlowchartDefinition, Component } from './flowchart.d';

export function validateConnections(connections: FlowchartDefinition['connections'], nodeInstances: Record<string, Component>)
	: { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	for (const [id, connection] of Object.entries(connections)) {

		const fromNode = nodeInstances[connection.from.node];
		const toNode = nodeInstances[connection.to.node];

		if (!fromNode) {
			errors.push(`Node with ID "${connection.from.node}" is not registered.`);
		}

		if (!toNode) {
			errors.push(`Node with ID "${connection.to.node}" is not registered.`);
		}

		if (errors.length > 0) {
			return { valid: false, errors };
		}


		const fromConnector = fromNode.outputs[connection.from.connector];
		const toConnector = toNode.inputs[connection.to.connector];

		if (!fromConnector) {
			errors.push(`Output connector "${connection.from.connector}" on node "${connection.from.node}" is not defined.`);
		}

		if (!toConnector) {
			errors.push(`Input connector "${connection.to.connector}" on node "${connection.to.node}" is not defined.`);
		}

		if (errors.length > 0) {
			return { valid: false, errors };
		}

		if (fromConnector && toConnector) {
			const { compatible, errors: compatibilityErrors } = areSchemasCompatible(fromConnector, toConnector);
			if (!compatible) {
				errors.push(...compatibilityErrors.map(err => `Connection "${id}": ${err}`));
			}
		}
	}

	return { valid: errors.length === 0, errors };
}

export function areSchemasCompatible(from: Schema, to: Schema): { compatible: boolean; errors: string[] } {
	// TODO: Do proper error handling

	if (to.type === 'any') {
		return { compatible: true, errors: [] };
	}

	if (from.type !== to.type) {
		return {
			compatible: false,
			errors: [`Incompatible types: '${from.type}' cannot be assigned to '${to.type}'`]
		};
	}

	if (from.type === 'array' && to.type === 'array') {
		if (from.items.type !== to.items.type) {
			return {
				compatible: false,
				errors: [`Incompatible array item types: '${from.items.type}' cannot be assigned to '${to.items.type}'`]
			};
		}
		return { compatible: true, errors: [] };
	}

	// Note that the 'or' operator is used as type guard. The check for matching types should be already done above.
	if (from.type !== 'object' || to.type !== 'object') return { compatible: true, errors: [] };

	const errors: string[] = [];

	if (to.required) {
		for (const name of to.required) {
			if (!from.required?.includes(name)) {
				errors.push(`Required property '${name}' is missing in the source schema`);
			}
		}
	} else {
		console.warn('No required properties defined in the destination schema');
	}

	if (!to.properties) {
		console.warn('No properties defined in the destination schema');
	} else {
		for (const name of Object.keys(to.properties)) {
			if (!from?.properties?.hasOwnProperty(name)) {
				console.warn(`Property '${name}' is not defined in the source schema`);
				continue;
			}
			const { errors: propertyErrors } = areSchemasCompatible(from.properties[name], to.properties[name]);
			errors.push(...propertyErrors.map(err => `'${name}': ${err}`));
		}

		if (to.additionalProperties === false) {
			if (Object.keys(from.properties || {}).length > Object.keys(to.properties).length) {
				errors.push(`Source schema has additional properties not defined in a strict destination schema`);
			}
		}
	}

	return { compatible: errors.length === 0, errors };
}
