import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { Flowchart } from './flowchart';
import type { Component, FlowchartDefinition } from './flowchart.d';

class TextDecoratorComponent implements Component {
	readonly inputs = {
		text: { type: 'string' as const }
	};

	readonly outputs = {
		text: { type: 'string' as const }
	};

	readonly settings = {
		type: 'object' as const,
		properties: {
			mode: { type: 'string' as const, enum: ['uppercase', 'lowercase'] }
		},
		required: ['mode']
	};

	constructor(private config: { mode: 'uppercase' | 'lowercase' }) { }

	async run(values: Record<string, any>): Promise<Record<string, any>> {
		const text = values.text as string;
		const decoratedText = this.config.mode === 'uppercase'
			? text.toUpperCase()
			: text.toLowerCase();

		return { text: decoratedText };
	}
}

class PrinterComponent implements Component {
	readonly inputs = {
		data: { type: 'any' as const }
	};

	readonly outputs = {};

	readonly settings = {
		type: 'null' as const
	};

	async run(values: Record<string, any>): Promise<void> {
		console.log('Output:', values.data);
	}
}

class ComponentRegistry {
	getInstance(nodeType: string, settings: any): Component {
		switch (nodeType) {
			case 'textDecorator':
				return new TextDecoratorComponent(settings);
			case 'printer':
				return new PrinterComponent();
			default:
				throw new Error(`Unknown component type: ${nodeType}`);
		}
	}
}

async function runFlowchart(flowchartPath: string, input?: string) {
	try {
		const flowchartData = JSON.parse(fs.readFileSync(flowchartPath, 'utf-8')) as FlowchartDefinition;

		const componentRegistry = new ComponentRegistry();
		const flowchart = new Flowchart(componentRegistry);

		for (const [nodeId, nodeDefinition] of Object.entries(flowchartData.nodes)) {
			console.log(`Adding node: ${nodeId} (${nodeDefinition.type})`);
			flowchart.addNode(nodeId, nodeDefinition);
		}

		for (const [connectionId, connection] of Object.entries(flowchartData.connections)) {
			console.log(`Adding connection: ${connectionId}`);
			flowchart.addConnection(connectionId, connection);
		}

		const entryNodes = findEntryNodes(flowchartData);
		console.log(`Found entry nodes: ${entryNodes.join(', ')}`);

		input = input || '';

		console.log(`Starting execution with input: "${input}"`);

		for (const nodeId of entryNodes) {
			const node = flowchart.getNode(nodeId);
			if (node) {
				const inputNames = Object.keys(componentRegistry.getInstance(flowchartData.nodes[nodeId].type, flowchartData.nodes[nodeId].settings).inputs);
				if (inputNames.length > 0) {
					await node.input(inputNames[0], input);
				}
			}
		}

		console.log('Flowchart execution completed');

	} catch (error) {
		console.error('Error running flowchart:', error);
		process.exit(1);
	}

function findEntryNodes(flowchart: FlowchartDefinition): string[] {
	const targetNodes = new Set<string>();

	for (const connection of Object.values(flowchart.connections)) {
		targetNodes.add(connection.to.node);
	}

	const allNodes = Object.keys(flowchart.nodes);
	return allNodes.filter(nodeId => !targetNodes.has(nodeId));
}

async function readStdin(): Promise<any> {
	const chunks: Buffer[] = [];
	for await (const chunk of process.stdin) {
		chunks.push(chunk);
	}
	return Buffer.concat(chunks).toString('utf8').trim();
}

async function askUser(question: string): Promise<string> {
	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

async function getInput(): Promise<string> {
	if (process.stdin.isTTY) {
		return askUser('Please enter input text: ');
	}
	return readStdin();
}

function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.log('Usage: npm start [flowchart-file]');
		console.log('       npm start [flowchart-file] < input.txt');
		console.log('       echo "input text" | npm start [flowchart-file]');
		console.log('Example: npm start example.flowchart.json');
		return;
	}

	const flowchartFile = args[0];

	const flowchartPath = path.resolve(flowchartFile);

	if (!fs.existsSync(flowchartPath)) {
		console.error(`Flowchart file not found: ${flowchartPath}`);
		process.exit(1);
	}

	getInput().then(input => {
		runFlowchart(flowchartPath, input);
	});
}

if (require.main === module) {
	main();
}