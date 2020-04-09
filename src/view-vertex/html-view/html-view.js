import { BOOLEAN } from "../../def"
import { ENTRY_UNIT } from '../../globals';
import { stream, combine, keyF, sync } from "air-stream"
import StylesController from "./styles-controller"
import {
	equal,
	routeNormalizer,
	signature as signatureEquals,
	getfrompath,
	calcsignature,
} from "../../utils"
import JSON5 from "json5"
import { LiveSchema } from "../../live-schema"
import resource from "../../loader/resource"
import { NODE_TYPES } from "./def"
import { Layer, BaseLayer } from "./layer"
import PlaceHolderContainer from "./place-holder-container"
import ActiveNodeTarget from "./active-node-target"
import { ModelVertex } from "../../model-vertex"
import CachedNodeVertex from './cached-node-vertex'

let UNIQUE_VIEW_KEY = 0;

class Cached {

	constructor({ constructor }) {
		this.__cache = [];
		this.constructor = constructor;
	}

	createIfNotExist( data, signature ) {
		let exist = this.__cache.find( ({ signature: x }) => signatureEquals(signature, x) );
		if(!exist) {
			exist = { signature, cell: this.constructor(data, data) };
			this.__cache.push(exist);
		}
		return exist.cell;
	}

}

export default class HTMLView extends LiveSchema {

	constructor( args, src, { acid } = {} ) {
		super( args, src, { acid } );
		this.prop.preload = this.prop.preload !== undefined ? this.prop.preload : true;
		this.prop.stream = this.prop.stream || "";
		this.prop.resources = this.prop.resources || [];
		this.prop.handlers = this.prop.handlers || [];
		this.prop.teeF = this.prop.teeF || null;
		this.prop.plug = this.prop.plug || [];
		this.prop.label = this.prop.label || "";
		this.prop.styles = this.prop.styles || [];
		this.prop.streamplug = this.prop.streamplug || [];
		this.prop.keyframes = this.prop.keyframes || [];
		this.prop.node = this.prop.node || document.createDocumentFragment();
	}

	static createApplicationRoot( { path = ENTRY_UNIT } ) {
		return new HTMLView( ["$", { use: [{ path, schtype: "html" }] }] );
	}

	createActiveNodeTarget(node, resources) {
		return new ActiveNodeTarget(this, node, resources);
	}

	findByLabel(label) {
		if(this.layers.some(({ prop: { label: x } }) => x === label)) {
			return this;
		}
		else {
			for(let i = 0; i < this.item.length; i ++ ) {
				const res = this.item[i].findByLabel(label);
				if(res) {
					return res;
				}
			}
		}
		return null;
	}

	createKitLayer( { $: { modelschema,
		parentViewLayers,
		layers: layers = new Map( [ [ -1, { layer: modelschema, vars: {} } ] ] ) },
		signature: parentContainerSignature = null,
		...args
	} ) {
		
		function removeElementFromArray(arr, elem) {
			const indexOf = arr.indexOf(elem);
			if(indexOf === -1) {
				throw "element not found";
			}
			return arr.splice(indexOf, 1)[0];
		}
		
		return stream( ( emt, { sweep, over }) => {
			
			const container = new PlaceHolderContainer( this, { type: "kit" } );
			
			emt( [ {
				stage: 1,
				container,
				target: container.target,
				acids: this.layers.map( ({ acid }) => acid ),
			} ] );

			//todo need layers sup
			const modelvertex = layers.get(this.acid) || layers.get(-1);
			const modelstream = modelvertex.layer.obtain("", modelvertex.vars);
			
			const cache = new Cached( {
				constructor: (data) => {
					
					const signature = calcsignature(data, this.prop.kit.prop);
					
					const modelvertex = new ModelVertex(["$$", {
						glassy: true,
						source: () => modelstream.map(([state]) => {
							const childs = getfrompath(state, this.prop.kit.getter);
							const res = childs.find( child => signatureEquals(signature, child) );
							return res !== undefined ? [res] : null;
						})
							.filter(Boolean)
							.distinct(equal)
					}]);
					
					let sign;
					if(typeof signature !== "object") {
						sign = { default: signature };
					}
					else {
						sign = signature;
					}

					modelvertex.parent = (layers.get(this.acid) || layers.get(-1)).layer;
					const _layers = new Map([ ...layers, [this.acid, { layer: modelvertex, vars: {} } ]]);
					return this.createTeeEntity(
						{ signature: {...sign, $: parentContainerSignature }, ...args },
						{ layers: _layers, parentViewLayers }
					);
					
				}
			} );
			
			over.add(() => cache.clear());

			const store = [];
			
			sweep.add(modelstream.at( ([ state ]) => {
				
				let childs;

				try {
					childs = getfrompath(state, this.prop.kit.getter);
				}
				catch (e) {
					childs = [];
				}
				
				let domTreePlacment = container.begin;
				
				const deleted = [ ...store];

				childs.map( child => {
					const signature = calcsignature(child, this.prop.kit.prop);
					const exist = store.find( ({ signature: $ }) => signatureEquals(signature, $ ) );
					if(!exist) {
						const box = new PlaceHolderContainer(this, { type: "item" });
						domTreePlacment.after(box.target);
						domTreePlacment = box.end;
						cache.createIfNotExist( child, signature )
							.at( ([ { stage, container } ]) => {
								container.remove();
								if(stage === 1) {
									box.append( container.target );
								}
							});
						store.push( { signature, box } );
					}
					else {
						removeElementFromArray(deleted, exist);
						if(exist.box.begin !== domTreePlacment.nextSibling) {
							exist.box.restore();
							domTreePlacment.after(exist.box.target);
						}
						domTreePlacment = exist.box.end;
					}
				} );
				
				deleted.map( item => {
					const deleted = store.indexOf(item);
					store.splice(deleted, 1);
					item.box.restore();
				} );
			} ));


		} );

	}

	createEntity( args, {
		modelschema,
		parentViewLayers,
		layers: layers = new Map( [ [ -1, { layer: modelschema, vars: {} } ] ] )
	}) {
		if(!this.prop.useOwnerProps) {
			parentViewLayers = [];
		}
		return stream( (emt, { sweep, over }) => {
			const clayers = new Map(
				this.layers.map(
					({ acid: _acid, src: { acid }, prop: { streamplug, stream } }, i, arr) => {
						let layer = null;
						let vars = null;
						let resultStreamPath = "";
						if(stream[0] === "^") {
							const eLayer =
								arr.slice(0, i).find( ({ prop: { stream } }) => stream[0] !== "^" );
							if(!eLayer) {
								throw `the first view layer cannot refer to the predecessor stream`
							}
							const { src: { acid }, prop: { stream: pstream } } = eLayer;
							//stream inheritance
							if(pstream === "" && !stream.substr(1)) {
								resultStreamPath = stream;
								({ layer, vars } = layers.get(acid));
								//vars = layers.get(acid).vars;
							}
							else {
								resultStreamPath = pstream + stream.substr(1);
								layer = (layers.get(acid) || layers.get(-1)).layer;
								vars = routeNormalizer(pstream + stream.substr(1))[1];
							}
						}
						else if(stream === "") {
							resultStreamPath = stream;
							({ layer, vars } = layers.get(acid) || layers.get(-1) ||
									//todo hack - unresolved stream source path
									[...layers][0][1]
							);
						}
						else {
							resultStreamPath = stream;
							layer = (layers.get(acid) || [...layers][0][1] ).layer;
							vars = routeNormalizer(stream)[1];
						}
						layer = streamplug.reduce( (acc, source) => {
							const res = new ModelVertex(["$$", { glassy: true, source }]);
							res.parent = acc;
							return res;
						}, layer);
						return [_acid, { layer: layer.get(resultStreamPath), vars }];
					})
			);
			Promise.all( [...clayers].map( ([, { layer } ]) => layer ) )
				.then( layers => new Map([ ...clayers].map( ([ acid, { vars } ], i) => [
					acid, { layer: layers[i], vars }
				] )))
				.then( layers => {
					if(this.layers.some( ({ prop: { kit } }) => kit )) {
						over.add(this.createKitLayer( { $: { layers, parentViewLayers }, ...args } ).on(emt));
					}
					else {
						over.add(this.createTeeEntity( args,  { layers, parentViewLayers } ).on(emt));
					}
				} );
		} );
	}

	createLayer(owner, { poppet = false, targets, resources }, args ) {
		if(poppet) {
			return new BaseLayer( this, { targets } );
		}
		return new Layer( this, owner, { targets, resources }, args );
	}

	createNextLayers( args, { layers, parentViewLayers = [] } ) {
		return stream( (emt, { sweep, over }) => {

			const container = new PlaceHolderContainer(this, { type: "layers" });
			
			let state = {
				acids: this.layers.map( ({ acid }) => acid ),
				acid: this.acid,
				stage: 0,
				container,
				key: this.key,
				target: container.target
			};

			const currentCommonViewLayers = parentViewLayers;
			parentViewLayers = [ ...parentViewLayers ];

			parentViewLayers.push(...this.layers
				.map( ( layer ) => {
					if([
						layer.prop.handlers.length,
						layer.prop.keyframes.length,
						layer.prop.plug.length,
					].some(Boolean)) {
						return { schema: { model: layers.get(layer.acid) }, layer };
					}
				})
				.filter( Boolean )
			);
			const literal = this.layers.find(layer => layer.prop.literal);
			if(literal) {
				literal.prop.keyframes = this.layers.map(layer => layer.prop.keyframes).flat();
			}
			sweep.add( combine( [
				...this.layers.map( (layer) => layer.createNodeEntity(  ) ),
				this.createChildrenEntity( args, { layers, parentViewLayers } ),
			] ).at( (comps) => {


				const children = comps.pop();
				container.append(...comps.map( ({ container: { target } }) => target));


				let rlayers = [];

				rlayers.push(...this.layers
					.map( ( layer, i ) => {

						const targets = [
							...container.targets("sounds", comps[i].resources ),
							...comps[i].container.targets( "datas", comps[i].resources ),
							...container.targets("actives", comps[i].resources )
						];

						if(targets.length) {
							return layer.createLayer(
								{ schema: { model: layers.get(layer.acid) } },
								{ resources: [], targets },
								args
							).stream;
						}

						return null;

					})
					.filter( Boolean )
				);
				
				const slots = container.slots();
				if(children.length) {
					if(slots.length) {
						children.map( ([{ target, acids }]) => {
							const place = slots
								.filter( ({ acid }) => acids.includes(acid) )
								.reduce(( exist, {slot} ) => {
									if(!exist) {
										exist = slot;
									}
									else if(
										exist.parentNode.nodeType !== NODE_TYPES.ELEMENT_NODE &&
										slot.parentNode.nodeType === NODE_TYPES.ELEMENT_NODE
									) {
										exist.remove();
										exist = slot;
									}
									else {
										slot.remove();
									}
									return exist;
								}, null);
							place.replaceWith( target );
						} );
					}
					else {
						container.append( ...children.map( ( [{ target }] ) => target ) );
					}
				}

				//todo hack clear unused slots ( when cross template mix to exmpl )
				slots.map( ({ slot }) => slot.remove() );
				
				const targets = [ ...container.targets("actives", [] ) ];
				
				if(targets.length) {
					
					this.prop.styles.forEach( ({idx}) => {
						targets.forEach(({node}) => {
							node.setAttribute(`data-style-acid-${idx}`, "");
						});
					} );
					
					rlayers.push( ...currentCommonViewLayers.map( ({ layer, schema }) => {
						return layer.createLayer(
							{ schema },
							{ resources: [], targets },
							args
						).stream;
					} ) );
				}
				if(!rlayers.length) {
					rlayers.push(this.createLayer(
						{ schema: null },
						{ poppet: true, resources: [], targets: [] },
						{}
					).stream);
				}

				over.add(sync(
					rlayers,
					([{ stage: a }], [{ stage: b }]) => a === b,
					( ...layers ) => [ { ...state, stage: layers[0][0].stage } ]
				).on( emt ));


			}) );
		} );
	}

	createNodeEntity() {
		return stream( (emt, { sweep }) => {
			sweep.add(combine( [
				...this.prop.resources,
				...this.prop.styles.map( ({style, idx}, priority) => {
					priority = +(style.getAttribute("priority") || priority);
					return StylesController.get(style, idx, priority, this.prop.pack)
				})
			] ).at( ( resources ) => {
				const container = new PlaceHolderContainer( this, { type: "node" } );
				if (
					this.layers.every(layer => !layer.prop.literal) || this.prop.literal
				) {
					container.append(this.prop.node.cloneNode(true));
				}
				const imgs = resources.filter(({type}) => type === "img");
				[...container.target.querySelectorAll(`slot[img]`)]
					.map((target, i) => {
						const key = +target.getAttribute("img");
						const { image } = imgs.find( img => img.key === key );
						target.replaceWith(image.cloneNode(true))
					});
				emt.kf();
				emt( { resources, container } );
			}));
		});
	}
	
	teeFSignatureCheck( layers ) {
		return this.layers.every( ({ acid, prop: { teeF } }) => teeF ? teeF(layers.get(acid), this.key) : true );
	}

	createTeeEntity( args, manager ) {
		if(!this.layers.some( ({ prop: { teeF } }) => teeF ) && this.prop.preload) {
			return this.createNextLayers( args, manager );
		}
		const { layers, parentViewLayers } = manager;
		
		const teeFLayers = this.layers
			.filter( ({ prop: { teeF } }) => teeF )
			.map( ({ acid }) => acid );
		const teeFStreamLayers = new Map([...layers].filter( ([acid]) => teeFLayers.includes(acid) ));
		const modelschema = combine(
			[...teeFStreamLayers]
				.map( ([, { layer, vars } ]) => layer.obtain("", vars) ),
			(...layers) => layers.map( ly => Array.isArray(ly) ? ly[0] : ly )
		);

		return stream( (emt, { sweep }) => {
			let state = {
				acids: this.layers.map( ({ acid }) => acid ),
				acid: this.acid, key: this.key, stage: 0, active: false, target: null
			};
			let childHook = null;
			let loaderHook = null;

			let loaderContainer = null;
			const container = new PlaceHolderContainer( this, { type: "entity" } );
			state.target = container.target;
			state.container = container;

			//todo temporary solution
			let connected = false;
			const connect = () => {
				if(connected) {
					return ;
				}
				connected = true;
				if(!loaderHook && !this.prop.preload) {
					sweep.add( loaderHook = this.obtain( "@loader", {}, { layers } )
						.at( ([ { stage, container: inner, target } ]) => {
							if(state.stage === 0 && stage > 0) {
								loaderContainer = inner;
								state = { ...state, load: true, stage: 1, };
								container.append( target );
								emt.kf();
								emt( [ state ] );
							}
						} )
					);
				}
				sweep.add( childHook = view
					.connectable( (data) => {
						if(data !== keyF) {
							if(state.load) {
								state = { ...state, load: false };
								loaderContainer.restore();
							}
							const [ { stage, container: inner } ] = data;
							_inner = inner;
							if(state.stage === 0) {
								state = { ...state, stage: 1 };
								emt.kf();
								emt( [ state ] );
							}
							if( stage === 1 ) {
								if(state.active) {
									childHook({action: "fade-in"});
									container.begin.after( _inner.target );
								}
								else {
									_inner && _inner.restore();
									if(!this.prop.preload) {
										childHook && sweep.force( childHook );
										childHook = null;
									}
								}
							}
						}
					} )
				);
				childHook.connect();
			};

			let _inner = null;
			const view = this.createNextLayers( args, { layers, parentViewLayers } );
			sweep.add( modelschema.at( (data) => {

				const active = this.teeFSignatureCheck(
					new Map([ ...teeFStreamLayers ].map( ([ acid ], i) => [acid, data[i]]) )
				);

				if(!active && !this.prop.preload) {
					loaderContainer && loaderContainer.remove();
					state = { ...state, stage: 1 };
					emt.kf();
					emt( [ state ] );
				}

				if(state.stage === 0) {
					if(this.prop.preload) {
						connect();
					}
				}

				if(active !== state.active) {
					state = { ...state, active };
					if(active) {
						if(!childHook) {
							connect();
						}
						else {
							if(state.stage === 1) {
								childHook({action: "fade-in"});
								container.begin.after( _inner.target );
							}
						}
					}
					else {
						if(childHook) {
							childHook({action: "fade-out"});
						}
					}
				}
			} ) );

		});
	}

	createChildrenEntity( args, { layers, parentViewLayers } ) {
		return combine( this.item
			.filter( ({ prop: { template } }) => !template )
			.map(x => x._obtain( [], args, { layers, parentViewLayers } ))
		);
	}
	
	parse(node, src, pkj ) {
		return this.constructor.parse( node, src, pkj );
	}
	
	static parse( node, src, { pack, type = "unit" } ) {
		if(!(node instanceof Element)) {
			return new HTMLView(["", {}], src, {createEntity: node});
		}
		if(!pack.cache.proto) {
			const comments = document.createTreeWalker(node, NodeFilter.SHOW_COMMENT);
			while(comments.nextNode()) comments.currentNode.remove();
			pack.cache.proto = CachedNodeVertex.parse(node, src, {pack, type});
		}
		const res = pack.cache.proto.map(src, (src, vertex) => {
			let uvk = `${++UNIQUE_VIEW_KEY}`;
			const { path = "./", key: pkey = uvk } = (src || {}).prop || {};
			let key = vertex.prop.rawKey;
			if(key !== null) {
				if(/[`"'{}\]\[]/.test(key)) {
					key = JSON5.parse(key);
				}
				uvk = key;
			}
			else {
				key = pkey;
			}
			const resources = [
				...(src.acid !== -1 && src.prop.resources || []),
				...vertex.prop.resources.map(x => resource(pack, x)),
			];
			/* TODO HACK */
			vertex.prop.styles.forEach( ({style}) => {
				style.pack = pack;
			} );
			/* TODO HACK */
			const node = vertex.prop.node.cloneNode(true);
			const stream = vertex.prop.stream
				.replace("$key", JSON.stringify(key))
				.replace(/(\/|^)"([^\/]+)"(\/|$)/g, '$1$2$3');
			const prop = {
				...vertex.prop,
				rawTee: null,
				rawKey: null,
				key,            //inherited or inner key
				resources,
				stream,
				path,           // absolute path
				type,           // view node type [node -> unit, switcher -> tee]
				pack,           // current package
				node,           // xml target node
			};
			const res = src.acid !== -1 && src.lift([uvk, prop], src) ||
				new HTMLView([uvk, prop], src);
			if(!vertex.prop.template && src.prop) {
				const slot = src.prop.node.querySelector('slot[acid="-"]');
				slot && slot.setAttribute("acid", res.acid);
			}
			return res;
		});
		return res;
	}
	
	mergeProperties( name, value ) {
		if(name === "stream") {
			return this.prop.stream;
		}
		else if(name === "useOwnerProps") {
			if(!value) {
				return false;
			}
			else {
				return this.prop.useOwnerProps;
			}
		}
		else if(name === "preload") {
			if(!value) {
				return false;
			}
			else {
				return this.prop.preload;
			}
		}
		else if(name === "controlled") {
			return value || this.prop.controlled;
		}
		else if(name === "styles") {
			return [ ...this.prop.styles, ...value.filter( style => !this.prop.styles.includes(style) ) ];
		}
		else if(name === "resources") {
			return [ ...this.prop.resources, ...value ]
				.reduce((acc, next) => acc.includes(next) ? acc : [ ...acc, next ], []);
		}
		/*else if(name === "template") {
			return this.prop.template || value;
		}*/
		/*else if( name == "tee" ) {
			return [ ...this.prop.tee, ...value];
		}*/
		else if([
			"literal",
			"label",
			"streamplug",
			"plug",
			"kit",
			"key",
			"teeF",
			"template",
			"handlers",
			"keyframes",
			"node",
			"pack",
			"source"
		].includes(name)) {
			return this.prop[name];
		}
		else {
			return super.mergeProperties( name, value );
		}
	}
	
}