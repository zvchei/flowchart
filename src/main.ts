import { compileSchema, SchemaNode } from 'json-schema-library';
import myJsonSchema from './flowchart.schema.json' assert { type: 'json' };
import { promises as fs } from 'fs';
import type { Connection, Flowchart, ConnectorSchema } from './flowchart';

/**
 * Reads JSON from stdin.
 * @returns The parsed JSON object.
 */
async function readStdin(): Promise<any> {
	const chunks: Buffer[] = [];
	for await (const chunk of process.stdin) {
		chunks.push(chunk);
	}
	return Buffer.concat(chunks).toString('utf8');
}

/**
 * Gets the connectors for a connection.
 * @param connection The connection object.
 * @param nodes The nodes in the flowchart.
 * @returns The source and destination connectors, or null if not found.
 */
function getConnectors(connection: Connection, nodes: Flowchart['nodes'])
	: { from: ConnectorSchema | null; to: ConnectorSchema | null; errors: Error[] } {
	const fromNode = nodes[connection.from.node];
	const toNode = nodes[connection.to.node];
	const errors: Error[] = [];

	if (!fromNode) {
		errors.push(new Error(`Source node '${connection.from.node}' not found`));
	}
	if (!toNode) {
		errors.push(new Error(`Destination node '${connection.to.node}' not found`));
	}

	const from = fromNode ? fromNode.outputs[connection.from.connector] : null;
	const to = toNode ? toNode.inputs[connection.to.connector] : null;

	if (!from) {
		errors.push(new Error(`Output '${connection.from.connector}' not found on node '${connection.from.node}'`));
	}
	if (!to) {
		errors.push(new Error(`Input '${connection.to.connector}' not found on node '${connection.to.node}'`));
	}

	return { from, to, errors };
}

/**
 * Checks if the connectors are compatible.
 * @param from The source connector.
 * @param to The destination connector.
 * @returns An object indicating if the connectors are compatible and any errors.
 */
function areConnectorsCompatible(from: ConnectorSchema, to: ConnectorSchema)
	: { valid: boolean; errors: Error[] } {
	const errors: Error[] = [];

	if (from.type !== to.type) {
		errors.push(new Error(`Incompatible types: '${from.type}' cannot connect to '${to.type}'`));
	}

	if (from.$ref !== to.$ref) {
		errors.push(new Error(`Incompatible references: '${from.$ref}' cannot connect to '${to.$ref}'`));
	}

	// Check if the requred properties match
	if (from.required && to.required) {
		for (const name of to.required) {
			if (!from.required.includes(name)) {
				errors.push(new Error(`Required property '${name}' is missing in source connector`));
			}

			const { errors: propertyErrors } = areConnectorsCompatible(from.properties[name], to.properties[name]);
			errors.push(...propertyErrors);
		}
	}

	return { valid: errors.length === 0, errors };
}

function printErrors(message: string, errors: Error[]): void {
	console.error(message);
	errors.forEach((error) => {
		console.error(`- ${error.message}`);
	});
}

/**
 * Entry point of the script.
 */
async function main() {
	const schema = compileSchema(myJsonSchema);

	let input: string = await (
		process.argv.length > 2
			? await fs.readFile(process.argv[2], 'utf8')
			: await readStdin()
	);

	const flowchart = JSON.parse(input) as Flowchart;

	const { valid, errors } = schema.validate(flowchart);
	if (!valid) {
		printErrors('Flowchart is invalid:', errors.map(e => new Error(e.message)));
		process.exit(1);
	}

	for (const [id, connection] of Object.entries(flowchart.connections)) {
		const { from, to, errors } = getConnectors(connection, flowchart.nodes);
		if (!from || !to) {
			printErrors(`Connection '${id}' is invalid:`, errors);
			process.exit(1);
		} else {
			{
				const { valid, errors } = areConnectorsCompatible(from, to);
				if (!valid) {
					printErrors(`Connection '${id}' is incompatible:`, errors);
					process.exit(1);
				}
			}
		}
	}

	// If we reach here, the flowchart is valid

	
}

main();