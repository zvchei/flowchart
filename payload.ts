import type { Node } from './flowchart';

// TODO: Split mutex and payload management into separate classes

export class Payload {
	data: Map<string, any>;
	private resolve: (value?: void | PromiseLike<void>) => void;

	/** 
	 * Promise that resolves when the payload is complete 
	 * @type {Promise<void>} 
	 */
	ready: Promise<void>;

	constructor(private fields: string[] = []) {
		this.data = new Map<string, any>();
		this.reset();
	}

	/** 
	 * Returns true if all fields are set 
	 * @returns {boolean}
	 */
	get complete(): boolean {
		return this.fields.every(key => this.data.has(key));
	}

	async set(key: string, value: any): Promise<void> {
		if (this.data.has(key)) {
			await this.ready;
		}
		
		this.data.set(key, value);
	}

	release(): void {
		this.data.clear();
		this.resolve();
		this.reset();
	}

	private reset(): void {
		this.ready = new Promise<void>((resolve) => {
			this.resolve = resolve;
		});
	}
}