import type { ComponentInstance, Node } from './flowchart.d';
import { Payload } from './payload';

export interface OutputSink {
	(value: any): Promise<void>;
}

export class NodeInstance implements Node {
	private payload: Payload;

	constructor(
		private readonly id: string,
		private readonly component: ComponentInstance,
		private outputs: Record<string, OutputSink[]>
	) {
		// TODO: Improved error handling
		const inputs = Object.keys(component.schema.inputs || {});

		if (inputs?.length === 0) {
			throw new Error(`Node ${id} must have at least one input.`);
		}
		this.payload = new Payload(inputs);
	}

	get schema() {
		const { inputs, outputs } = this.component.schema;
		return { inputs, outputs } as const;
	}

	async input(name: string, data?: any): Promise<void> {
		const complete = await this.payload.set(name, data);

		if (complete) {
			const data = Object.fromEntries(this.payload.data);
			const result = (await this.component.runnable(data, this.component.settings)) || {};

			await this.output(result);

			this.payload.release();
		} else {
			await this.payload.ready;
		}
	}

	private async output(data: Record<string, any>): Promise<void> {
		const outputs = Object.entries(data).map(([key, value]) => {
			if (!this.outputs[key]) {
				// TODO: Improved error handling
				console.warn(`Node ${this.id} produced unhandled output: ${key}`);
				return;
			} else {
				return this.outputs[key].map(sink => sink(value));
			}
		}).flat();

		await Promise.all(outputs);
	}
}