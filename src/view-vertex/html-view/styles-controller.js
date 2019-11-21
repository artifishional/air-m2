import resource from "../../loader/resource"

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
		return this.cache.get(style).resource;
	}
	
}