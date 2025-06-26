import type { Connection, Flowchart } from './flowchart';
import type { Schema } from './schema.d';
import { compileSchema, SchemaNode } from 'json-schema-library';
import myJsonSchema from './flowchart.schema.json' assert { type: 'json' };
import { promises as fs } from 'fs';
import { areSchemasCompatible } from './schema';

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
 * Gets the connectors of a connection.
 * @param connection The connection object.
 * @param nodes The nodes in the flowchart.
 * @returns The source and destination connectors, or null if not found.
 */
function getConnectors(connection: Connection, nodes: Flowchart['nodes'])
	: { from: Schema | null; to: Schema | null; errors: Error[] } {
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

function printErrors(message: string, errors: string[]): void {
	console.error(message);
	errors.forEach((error) => {
		console.error(`- ${error}`);
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
		printErrors('Flowchart is invalid:', errors.map(e => e.message));
		process.exit(1);
	}

	for (const [id, connection] of Object.entries(flowchart.connections)) {
		const { from, to, errors } = getConnectors(connection, flowchart.nodes);
		if (!from || !to) {
			printErrors(`Connection '${id}' is invalid:`, errors.map(e => e.message));
			process.exit(1);
		} else {
			{
				const { compatible, errors } = areSchemasCompatible(from, to);
				if (!compatible) {
					printErrors(`Connection '${id}' is incompatible:`, errors);
					process.exit(1);
				}
			}
		}
	}

	// If we reach here, the flowchart is valid
}

main();