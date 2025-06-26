import type { Flowchart, NodeClass } from './flowchart';
import { compileSchema } from 'json-schema-library';
import flowchartSchemaDefinition from './flowchart.schema.json' assert { type: 'json' };
import { promises as fs } from 'fs';
import { areSchemasCompatible, validateConnections } from './schema';
import { NodeAdapter } from './node-adapter';

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

function printErrors(message: string, errors: string[]): void {
	console.error(message);
	errors.forEach((error) => {
		console.error(`- ${error}`);
	});
}

const nodeRegistry: Record<string, NodeClass> = {
	textDecorator: {
		inputs: {
			text: { type: 'string' }
		},
		outputs: {
			text: { type: 'string' }
		},
		settings: {
			type: 'object',
			required: ['mode'],
			properties: {
				mode: { type: 'string' }
			}
		},
		getInstance(settings) {
			return {
				run: async ({ text }: { text: string }) => {
					return { text: settings.mode === 'uppercase' ? text.toUpperCase() : text.toLowerCase() };
				}
			}
		}
	},
	printer: {
		inputs: {
			data: { type: 'any' },
		},
		outputs: {},
		settings: { type: 'null' },
		getInstance(settings) {
			return {
				run: async ({ data }: Record<string, any>) => {
					console.log(data);
				}
			};
		}
	}
};

/**
 * Entry point of the script.
 */
async function main() {
	const flowchartSchema = compileSchema(flowchartSchemaDefinition);

	let input: string = await (
		process.argv.length > 2
			? await fs.readFile(process.argv[2], 'utf8')
			: await readStdin()
	);

	const flowchart = JSON.parse(input) as Flowchart;

	{
		const { valid, errors } = flowchartSchema.validate(flowchart);
		if (!valid) {
			printErrors('Flowchart is invalid:', errors.map(e => e.message));
			process.exit(1);
		}
	}

	const nodeClasses = Object.fromEntries(
		Object.entries(flowchart.nodes).map(([id, node]) => {
			const nodeClass: NodeClass = nodeRegistry[node.type];

			if (!nodeClass) {
				printErrors(`Node type "${node.type}" is not registered:`, [
					`Node with ID "${id}" has an unregistered type "${node.type}".`
				]);
				process.exit(1);
			}

			const settingsSchema = compileSchema(nodeClass.settings);
			const { valid, errors } = settingsSchema.validate(node.settings);
			if (!valid) {
				printErrors(`Settings for node "${id}" are invalid:`, errors.map(e => e.message));
				process.exit(1);
			}

			return [id, nodeClass];
		})
	);

	const activeNodes: Map<string, NodeAdapter> = new Map();

	{
		const { valid, errors } = validateConnections(flowchart.connections, nodeClasses);
		if (!valid) {
			printErrors('Connection validation errors found:', errors);
			process.exit(1);
		}
	}

	const activeOutputs = Object
		.values(flowchart.connections)
		.reduce((collection, connection) => {
			// TODO: Handle unhandled outputs more gracefully
			// TODO: Use a better error handling mechanism
			const { node, connector } = connection.from;

			if (!collection[node]) {
				collection[node] = {};
			}

			if (!collection[node][connector]) {
				collection[node][connector] = [];
			}

			collection[node][connector].push(async (value: any) => {
				const node = activeNodes.get(connection.to.node);
				node!.input(connection.to.connector, value);
			});

			return collection;
		}, {});

	for (const [nodeId, nodeClass] of Object.entries(nodeClasses)) {
		const settings = flowchart.nodes[nodeId].settings;
		const inputNames = Object.keys(nodeClass.inputs);
		const outputFunctions = activeOutputs[nodeId];

		const activeNode = new NodeAdapter(
			nodeId,
			nodeClass.getInstance(settings),
			inputNames,
			outputFunctions
		);

		activeNodes.set(nodeId, activeNode);
	}

	const query = 'Hello, World!';
	console.log(query);
	await activeNodes.get('start')!.input('text', query);
}

main();