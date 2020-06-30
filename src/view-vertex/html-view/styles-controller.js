import { stream2 as stream } from 'air-stream';

export default new class {
	
	constructor() {
		this.cache = new WeakMap();
	}
	
	get( style, acid, priority, pack, resourceloader ) {
		if(!this.cache.has( style )) {
			this.cache.set( style, {
				resource: resourceloader(resourceloader, style.pack, { type: "inline-style", style, acid, priority })
			} );
		}
		return stream.fromPromise(this.cache.get(style).resource);
	}
	
}