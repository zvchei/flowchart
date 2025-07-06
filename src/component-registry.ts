import type { Component, ComponentInstance, Runnable } from './flowchart.d';
import { parseComponentConfiguration } from './schema';

// Component definitions as JSON strings
const textDecoratorComponentDef = `{
	"inputs": {
		"text": { "type": "string" }
	},
	"outputs": {
		"text": { "type": "string" }
	},
	"settings": {
		"type": "object",
		"properties": {
			"mode": { "type": "enum", "enum": ["uppercase", "lowercase"] }
		},
		"required": ["mode"]
	},
	"code": {
		"type": "inline",
		"source": "const { text } = values; const { mode } = settings; const decoratedText = mode === 'uppercase' ? text.toUpperCase() : text.toLowerCase(); return { text: decoratedText };"
	}
}`;

const printerComponentDef = `{
	"inputs": {
		"data": { "type": "any" }
	},
	"outputs": {},
	"settings": {
		"type": "null"
	},
	"code": {
		"type": "inline",
		"source": "console.log('Output:', values.data);"
	}
}`;

export class ComponentRegistry {
	private components: Map<string, Component> = new Map();

	constructor(private readonly runnableConstructor: (code: Component['code']) => Runnable = createRunFunction) {
		this.registerComponent('textDecorator', parseComponentConfiguration(textDecoratorComponentDef));
		this.registerComponent('printer', parseComponentConfiguration(printerComponentDef));
	}

	getInstance(nodeType: string, settings: Record<string, any>): ComponentInstance {
		const component = this.components.get(nodeType);
		if (!component) {
			throw new Error(`Unknown component type: ${nodeType}`);
		}
		return { schema: component, settings, runnable: this.runnableConstructor(component.code) };
	}

	registerComponent(name: string, component: Component): void {
		this.components.set(name, component);
	}
}

function createRunFunction(code: Component['code']): Runnable {
	if (code.type === 'external' || code.type === 'flowchart') {
		throw new Error('External and Flowchart-based components not yet implemented');
	}

	const functionBody = code.source;
	const asyncFunction = `return (async() => {${functionBody}})()`;

	const runnable = new Function('values', 'settings', asyncFunction);

	return async (values: Record<string, any>, settings: Record<string, any>) => {
		const result = runnable(values, settings);
		return result;
	};
}