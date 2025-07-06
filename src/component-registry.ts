import type { Component } from './flowchart.d';

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

export class ComponentRegistry {
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
