import type { Node } from './flowchart';

export class Payload extends Map<string, any> {
	private resolve: (value?: void | PromiseLike<void>) => void;

	/** 
	 * Promise that resolves when the payload is complete 
	 * @type {Promise<void>} 
	 */
	ready: Promise<void>;

	constructor(private fields: string[] = []) {
		super();
		this.ready = new Promise<void>((resolve) => {
			this.resolve = resolve;
		});
	}

	/** 
	 * Returns true if all fields are set 
	 * @returns {boolean}
	 */
	get complete(): boolean {
		return this.fields.every(key => this.has(key));
	}

	/**
	 * Sets the data for a specific key and resolves the ready promise if complete
	 * @param {string} key - The key name
	 * @param {any} data - The data to set
	 * @returns {this}
	 */
	set(key: string, data: any): this {
		super.set(key, data);
		
		if (this.complete) {
			this.resolve();
		}

		return this;
	}
}