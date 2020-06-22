import { LiveSchema } from "../live-schema"
import { ObservableCollection } from "../observable-collection"
import { stream2 as stream } from "air-stream"
import { error } from "../error"
import { ENTRY_UNIT } from '../globals';
import resourceloader from "../loader/resource-loader";
import { EMPTY } from '../def';

function frommodule(module, _key = "main") {
	return [ _key,
		...Object.keys(module).filter(key => key === "default").map( key => {
			if (typeof module.default === "function") {
				return {source: module[key]};
			}
		}),
		...Object.keys(module).filter(key => key !== "default").map( key => {
			if(key === "*") {
				return module[key];
			}
			if(typeof module[key] === "function") {
				return [ key, { source: module[key] } ];
			}
			else if(typeof module[key] === "object") {
				return frommodule(module[key], key);
			}
		})
	];
}

const observers = new Map();

const EMPTY_STREAM = stream.fromCbFunc((cb) => {
	cb([EMPTY])
})
	.store();

const EMPTY_STREAM_CR = () => EMPTY_STREAM;

export default class ModelVertex extends LiveSchema {

	constructor([ key, { source = EMPTY_STREAM_CR, ...prop }, ...item], src) {
		super([ key, { source, ...prop }, ...item], src);
		this.resourceloader = src.resourceloader;
	}

	static createApplicationRoot( { path = ENTRY_UNIT, resourceloader = ModelVertex.resourceloader } ) {
		const model = new ModelVertex( [ "$", {}, ], { resourceloader }, );
		model.append([ "error", { id: "error", source: error } ], [ "main", { use: [{ path }]} ],);
		return model;
	}
	
	static observe(src, cb) {
		if(!observers.has(src)) {
			observers.set(src, []);
		}
		observers.get(src).push(cb);
		function handleChanges(self, { added }) {
			added.map( ({ entity }) => ObservableCollection.observe(entity, "obs", () => cb(src)));
			cb( src );
		}
		ObservableCollection.observe( src, "entities", handleChanges );
		src.slice(2).map( schema => ModelVertex.observe(schema, cb) );
	}
	
	append(...item) {
		super.append(...item);
		observers.get(this) && observers.get(this).map( cb => {
			item.map( schema => ModelVertex.observe(schema, cb) );
			cb(this);
		} );
	}

	merge( data ) {
		//protection of duplication of original layers
		super.merge( data );
		this.layers.map( layer => layer.entities = this.entities );
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

	createEntity( signature ) {
		return this.prop.source({
			obtain: (route, signature) => this.obtain(route, signature),
			schema: this,
			stream,
			...signature
		});
    }

}

ModelVertex.resourceloader = resourceloader;