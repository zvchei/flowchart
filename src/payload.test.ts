import { Payload } from './payload';

describe('Payload', () => {
	it('must become complete when all connectors are set', async () => {
		const payload = new Payload(['a', 'b']);
		await payload.set('a', 1);
		expect(payload.complete).toBe(false);
		await payload.set('b', 'foo');
		expect(payload.complete).toBe(true);
	});

	it('must resolve ready promise when release is called', async () => {
		let resolved = false;
		const payload = new Payload(['a', 'b']);
		payload.ready.then(() => { resolved = true; });

		await payload.set('a', 1);
		await payload.set('b', 'foo');
		await new Promise<void>(resolve => setTimeout(resolve, 1));
		expect(resolved).toBe(false);

		payload.release();
		await new Promise<void>(resolve => setTimeout(resolve, 1));
		expect(resolved).toBe(true);
	});

	it('contains all set values', async () => {
		const payload = new Payload(['a', 'b']);
		await payload.set('a', 1);
		await payload.set('b', 'foo');
		expect(Object.fromEntries(payload.data)).toEqual({ a: 1, b: 'foo' });
	});

	it('must wait for ready promise when setting existing key', async () => {
		const payload = new Payload(['a', 'b']);
		let setOneResolved = false;
		let setTwoResolved = false;

		payload.set('a', 1).then(() => setOneResolved = true);
		await new Promise<void>(resolve => setTimeout(resolve, 1));
		expect(setOneResolved).toBe(true);

		payload.set('a', 2).then(() => setTwoResolved = true);
		await new Promise<void>(resolve => setTimeout(resolve, 1));
		expect(setTwoResolved).toBe(false);

		payload.release();
		await new Promise<void>(resolve => setTimeout(resolve, 1));
		expect(setTwoResolved).toBe(true);
	});
});