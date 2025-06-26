import type { NodeInstance } from './flowchart.d';
import { Payload } from './payload';

export interface Sink {
	(value: any): Promise<void>;
}

export class NodeAdapter {
	private payload: Payload;

	constructor(
		private readonly id: string,
		private component: NodeInstance,
		inputs: string[],
		private outputs: Record<string, Sink[]>
	) {
		// TODO: Improved error handling
		if (inputs?.length === 0) {
			throw new Error(`Node ${id} must have at least one input.`);
		}
		this.payload = new Payload(inputs);
	}

	async input(name: string, data?: any): Promise<void> {
		const complete = await this.payload.set(name, data);

		if (complete) {
			const data = Object.fromEntries(this.payload.data);
			const result = (await this.component.run(data)) || {};

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