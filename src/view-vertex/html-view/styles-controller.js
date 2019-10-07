import {fromPromise} from 'air-stream';

export default new class {
	
	constructor() {
		this.cache = new WeakMap();
	}
	
	get( style, acid, priority, pack, resourceloader ) {
		if(!this.cache.has( style )) {
			this.cache.set( style, {
				resource: resourceloader(style.pack, { type: "inline-style", style, acid, priority })
			} );
		}
		return fromPromise(this.cache.get(style).resource);
	}
	
}