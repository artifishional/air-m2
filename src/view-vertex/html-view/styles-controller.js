import resource from "air-m2/src/loader/resource"
import {fromPromise} from 'air-stream';

export default new class {
	
	constructor() {
		this.cache = new WeakMap();
	}
	
	get( style, acid, priority, pack ) {
		if(!this.cache.has( style )) {
			this.cache.set( style, {
				resource: resource(style.pack, { type: "inline-style", style, acid, priority })
			} );
		}
		return fromPromise(this.cache.get(style).resource);
	}
	
}