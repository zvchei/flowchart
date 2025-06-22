import { Payload } from './payload';

describe('Payload', () => {
	it('must become complete when all connectors are set', () => {
		const payload = new Payload(['a', 'b']);
		payload.set('a', 1);
		expect(payload.complete).toBe(false);
		payload.set('b', 'foo');
		expect(payload.complete).toBe(true);
	});

	it('must resolve ready promise when complete', async () => {
		let resolved = false;
		const payload = new Payload(['a', 'b']);
		payload.ready.then(() => { resolved = true; });

		payload.set('a', 1);
		await new Promise<void>(resolve => setTimeout(resolve, 1));
		expect(resolved).toBe(false);

		payload.set('b', 'foo');
		await new Promise<void>(resolve => setTimeout(resolve, 1));
		expect(resolved).toBe(true);
	});

	it('contains all set values', () => {
		const payload = new Payload(['a', 'b']);
		payload.set('a', 1);
		payload.set('b', 'foo');
		expect(Object.fromEntries(payload)).toEqual({ a: 1, b: 'foo' });
	});
});
