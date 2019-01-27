import { LiveSchema } from "../live-schema"
import { stream } from "air-stream"

function frommodule(module, _key = "main") {
	return [ _key,
		...Object.keys(module).filter(key => key === "default").map( key => {
			if (typeof module.default === "function") {
				return {source: module[key]};
			}
		}),
		...Object.keys(module).filter(key => key !== "default").map( key => {
			if(typeof module[key] === "function") {
				return [ key, { source: module[key] } ];
			}
			else if(typeof module[key] === "object") {
				return frommodule(module[key], key);
			}
		})
	];
}

export default class ModelVertex extends LiveSchema {

	constructor([ key, { source = () => stream( emt => `empty point ${key}` ), ...prop }, ...item], src) {
		super([ key, { source, ...prop }, ...item], src);
	}

	parse( module, src ) {
		let exist = null;
	    if(Array.isArray(module)) {
		    exist = module;
        }
	    else {
		    exist = module.default;
		    if(!Array.isArray(exist) && typeof exist === "object") {
			    exist = frommodule(exist);
		    }
		    if (Array.isArray(exist)) { }
		    else {
			    exist = [ "main", { source: exist } ];
		    }
        }
		let [ key, prop = {}, ...item ] = exist;
		if(Array.isArray(prop)) {
			item.unshift( prop );
			prop = {};
        }
		const res = new ModelVertex([ key, prop ], src);
		res.append(...item.map( module => this.parse( module, res) ));
		return res;
	}
	
	createEntity( args ) {
		return this.prop.source({
			obtain: (route, args) => this.obtain(route, { ...args }),
			schema: this,
			stream,
			...args
		});
    }

}