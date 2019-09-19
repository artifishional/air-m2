import { BOOLEAN } from "../../def"
import { VIEW_PLUGINS } from "../../globals"
import { stream, combine, keyF, sync } from "air-stream"
import StylesController from "./styles-controller"
import {
	equal,
	routeNormalizer,
	routeToString,
	signature as signatureEquals,
	getfrompath,
	calcsignature,
} from "../../utils"
import events from "../events"
import JSON5 from "json5"
import { LiveSchema } from "../../live-schema"
import resource from "../../loader/resource"
import { NODE_TYPES } from "./def"
import { Layer, BaseLayer } from "./layer"
import PlaceHolderContainer from "./place-holder-container"
import ActiveNodeTarget from "./active-node-target"
import { ModelVertex } from "../../model-vertex"

let UNIQUE_VIEW_KEY = 0;
let UNIQUE_IMAGE_KEY = 0;

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
		this.prop.tee = this.prop.tee || null;
		this.prop.plug = this.prop.plug || [];
		this.prop.label = this.prop.label || "";
		this.prop.styles = this.prop.styles || [];
		this.prop.streamplug = this.prop.streamplug || [];
		this.prop.keyframes = this.prop.keyframes || [];
		this.prop.node = this.prop.node || document.createDocumentFragment();
	}

	createActiveNodeTarget(node, resources) {
		return new ActiveNodeTarget(node, resources);
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

					//todo need refactor
					if(this.layers.some( ({ prop: { tee } }) => tee ) || !this.prop.preload) {
						return this.createTeeEntity(
							{ signature: {...sign, $: parentContainerSignature }, ...args },
							{ layers: _layers, parentViewLayers }
						);
					}
					else {
						return this.createNextLayers(
							{ signature: {...sign, $: parentContainerSignature }, ...args },
							{ layers: _layers, parentViewLayers }
						);
					}
					
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
						domTreePlacment.after(exist.box.target);
						domTreePlacment = exist.box.end;
					}
				} );
				
				deleted.map( item => {
					const deleted = store.indexOf(item);
					store.splice(deleted, 1);
					item.box.remove();
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
						//todo need refactor
						if(this.layers.some( ({ prop: { tee } }) => tee ) || !this.prop.preload) {
							over.add(this.createTeeEntity( args,  { layers, parentViewLayers } ).on(emt));
						}
						else {
							over.add(this.createNextLayers( args, { layers, parentViewLayers } ).on(emt));
						}
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
					
					if(this.prop.styles.length) {
						targets.map(({node}) =>
							node.setAttribute(`data-scope-acid-${this.acid}`, "")
						);
					}
					
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
				...this.prop.styles.map( (style, priority) => {
					priority = +(style.getAttribute("priority") || priority);
					return StylesController.get(style, this.acid, priority, this.prop.pack)
				})
			] ).at( ( resources ) => {
				const container = new PlaceHolderContainer( this, { type: "node" } );
				container.append(this.prop.node.cloneNode(true));
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

	teeSignatureCheck( layers ) {
		return this.layers.every( ({ acid, prop: { tee } }) => signatureEquals( tee, layers.get(acid) ) );
	}

	createTeeEntity( args, { layers, parentViewLayers } ) {

		const teeLayers = this.layers
			.filter( ({ prop: { tee } }) => tee )
			.map( ({ acid }) => acid );

		const teeStreamLayers = new Map([...layers].filter( ([acid]) => teeLayers.includes(acid) ));
		
		const modelschema = combine(
			[...teeStreamLayers].map( ([, { layer, vars } ]) => layer.obtain("", vars) ),
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
			if(!this.prop.preload) {
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
			const connect = () => {
				if(connected) {
					return ;
				}
				connected = true;
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

				const active = this.teeSignatureCheck(
					new Map([ ...teeStreamLayers ].map( ([ acid ], i) => [acid, data[i]]) )
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
	
	parse(node, src, { pack } ) {
		return this.constructor.parse( node, src, { pack } );
	}
	
	static parse( node, src, { pack, type = "unit" } ) {

		let uvk = `${++UNIQUE_VIEW_KEY}`;
		
		if(!(node instanceof Element)) {
			return new HTMLView( ["", {}], src, { createEntity: node } );
		}
		
		//TODO: (improvement required)
		// currently clones the entire contents and then
		// removes it from the parent element to solve the shared units problem

		const cur = node.cloneNode(true);
		node.parentNode.append(cur);
		node = cur;

		const { path = "./", key: pkey = uvk } = (src || {}).prop || {};

		let key = node.getAttribute("key");
		
		if(key !== null) {
			if(/[`"'{}\]\[]/.test(key)) {
				key = JSON5.parse(key);
			}
			uvk = key;
		}
		else {
			key = pkey;
		}
		
		const handlers = [ ...node.attributes ]
			.filter( ({ name }) => events.includes(name) || name.indexOf("on:") === 0 )
			.map( ({ name, value }) => ({
				name: name.replace(/^on(:)?/, ""),
				hn: new Function("event", "options", "request", "key", "signature", "req", value )
			}) );

		const stream = (node.getAttribute("stream") || "")
			.replace("$key", JSON.stringify(key))
			.replace(/(\/|^)"([^\/]+)"(\/|$)/g, '$1$2$3');

		const label = node.getAttribute("label") || "";

		const template = ["", "true"].includes(node.getAttribute("template"));
		const id = node.getAttribute("id") || "$";

		const use = pathParser( node.getAttribute("use") || "" );

        const resources =
            [ ...(src.acid !== -1 && src.prop.resources || []), ...JSON5
                .parse(node.getAttribute("resources") || "[]")
                .map( x => resource(pack, x) )
            ];

		const styles = [...node.children].filter(byTagName("STYLE"));
		
		styles.map( style => {
			//todo hack
			style.pack = pack;
			style.remove();
		} );
		//resources.push(...styles.map( style => resource(pack, { type: "inline-style", style }) ));

		const sounds = [...node.children].filter(byTagName("SOUND"));
		resources.push(...sounds.map( sound => resource(pack, { type: "sound", name: sound.getAttribute("name") || "", rel: sound.getAttribute("rel") || ""}) ));

		const tee = cuttee(node, key);
		const kit = cutkit(node, key);
        const preload =
			!["", "true"].includes(node.getAttribute("nopreload")) &&
			!["", "true"].includes(node.getAttribute("lazy"));
        
        const useOwnerProps = node.parentNode.tagName.toUpperCase() === "UNIT";
		node.remove();
        
        const controlled = [ ...node.childNodes ].some( node => {
			if(node.nodeType === 1 && !["UNIT", "PLUG", "STYLE"].includes(node.tagName.toUpperCase())) {
				return true;
			}
			else if( node.nodeType === 3 && node.nodeValue[0] === "{" ) {
				return true;
			}
		} );
		
		const streamplug = [...node.children]
			.filter(byTagName("script"))
			.filter(byAttr("data-source-type", "stream-source"))
			.map( plug => {
				const src = document.createElement("script");
				VIEW_PLUGINS.set(src, null);
				src.textContent = plug.textContent;
				document.head.append( src );
				const res = VIEW_PLUGINS.get(src).default;
				VIEW_PLUGINS.delete(src);
				plug.remove();
				src.remove();
				return res;
			} );
		
		const plug = [...node.children]
			.filter(byTagName("script"))
			.filter(byAttr("data-source-type", "view-source"))
			.map( plug => {
				const src = document.createElement("script");
				VIEW_PLUGINS.set(src, null);
				src.textContent = plug.textContent;
				document.head.append( src );
				const res = VIEW_PLUGINS.get(src).default;
				VIEW_PLUGINS.delete(src);
				plug.remove();
				src.remove();
				return res;
			} );
   
		const keyframes = [];

		const prop = {
			label,			//debug layer label
			styles,         //inline style defenitions
			streamplug,		//stream inline plugins
			plug,			//view inline plugins
			controlled,     //has one or more active childrens (text or node)
			useOwnerProps,  //must consider parent props
			kit,            //kit's container
            tee,            //switch mode
            preload,        //must be fully loaded before readiness
            pack,           //current package
			keyframes,      //animation ( data ) settings
			use,            //reused templates path
			template,       //template node
			id,             //tree m2 advantages id
			type,           //view node type [node -> unit, switcher -> tee]
			//source,       //m2 advantages source path if module
			handlers,       //event handlers
			path,           //absolute path
			node,           //xml target node
			key,            //inherited or inner key
			stream,         //link to model stream todo obsolete io
			resources,      //related resources
		};
		
		const res = src.acid !== -1 && src.lift( [ uvk, prop ], src ) ||
			new HTMLView( [ uvk, prop ], src );
		
		//[...node.childNodes].map( next => setup( next, res.prop ));

		res.append(...[...node.children].reduce((acc, next) =>
				[...acc, ...parseChildren( next, res.prop, res )]
			, []));

		keyframes.push(...parseKeyFrames( { node } ));

		res.prop.node = document.createDocumentFragment();
		res.prop.node.append( ...node.childNodes );
		
		/*[...styles].map( style => {
			style.textContent = style.textContent.replace(/:scope/g, `[data-scope-acid-${res.acid}]`);
		} );*/
		
		/*styles.length && [...res.prop.node.children]
			.map( node => {
				node.setAttribute(`data-scope-acid-${res.acid}`, "");
			} );*/
		
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
			"label",
			"streamplug",
			"plug",
			"kit",
			"key",
			"tee",
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

function pathSplitter(str = "") {
	str = str + ",";
	let mode = 0;
	let prev = 0;
	const res = [];
	for(let i = 0; i < str.length; i++ ) {
		if(str[i] === "{") {
			mode++;
		}
		else if(str[i] === "}") {
			mode--;
		}
		else if(str[i] === ",") {
			if(mode === 0) {
				res.push( str.substring(prev, i) );
				prev = i+1;
			}
		}
	}
	return res;
}

function pathParser(str) {
	return pathSplitter(str)
		.map( (ly)=>{
			ly = ly.trim();
			if(!ly) {
				return null;
			}
			else {
				let [ , path = null ] = ly.match( /^url\((.*)\)$/ ) || [];
				if(path) {
					return { path, type: "url", schtype: "html" };
				}
				else {
					return { path: ly, type: "query", schtype: "html" };
				}
			}
		} )
		.filter( Boolean )
}

const REG_GETTER_ATTRIBUTE = /\(([a-zA-Z_][\[\].a-zA-Z\-_0-9]*?)\)/g;


function parseKeyProps( { classList, ...prop } ) {
	if(classList) {
		return {
			classList: Object.keys(classList).reduce( (acc, next) => {
				if(next.indexOf("|") > - 1) {
					next.split("|").reduce( (acc, name) => {
						acc[name] = classList[next] === name;
						return acc;
					}, acc);
				}
				else {
					acc[next] = !!classList[next];
				}
				return acc;
			}, {} ),
			...prop,
		}
	}
	return {
		...prop,
	}
}

function parseKeyFrames( { node } ) {
	let res = [];
	const keyframe = node.querySelectorAll("keyframe");
	if(keyframe.length) {
		res = [...keyframe].map( node => {
			const action = node.getAttribute("name") || "default";
			let prop = (node.getAttribute("prop"));
			if(prop) {
				prop = prop.replace(REG_GETTER_ATTRIBUTE, (_, reg) => {
					return `(argv.${reg})`;
				});
				prop = new Function("argv", "ttm", `return ${prop}`);
			}
			const keys = [...node.querySelectorAll("key")]
				.map( node => {
					let prop = null;
					let offset = node.getAttribute("offset");
					let properties = node.getAttribute("prop");
					if(properties) {
						const functionBuilder = properties.replace(REG_GETTER_ATTRIBUTE, (_, reg) => {
							return `(argv.${reg})`;
						});
						const handler = new Function("argv", "ttm", `return ${functionBuilder}`);
						prop = (argv) => {
							try {
								return parseKeyProps(handler(argv));
							}
							catch (e) {
								return {};
							}
						};
					}
					return [ offset, prop ];
				} );
			node.remove();
			return [ action, prop, ...keys ];
		} );
	}
	return res;
}

function cuttee(node, key) {
	let rawTee = node.getAttribute("tee");
	if(rawTee === null) {
		return null;
	}
	else if(rawTee === "") {
		return key;
	}
	else if(rawTee[0] === "{") {

		//autocomplete { value } boolean
		rawTee = rawTee.replace(/{\s*([a-zA-Z0-9]+|"[\-!&$?*a-zA-Z0-9]+")\s*}/g, (_, vl) => {
			return "{" +  vl + ":$bool" + "}"
		});

		return new Function("$bool", "return" + rawTee)(BOOLEAN);
	}
	else {
		return rawTee;
	}
}

const REG_GETTER_KIT = /(?:\(([a-zA-Z0-9.\-\[\]]+)\))?(?:{([a-zA-Z0-9.\-\[\],]+)})?/;

function cutkit(node) {
	const raw = node.getAttribute("kit");
	if(raw === null) {
		return null;
	}
	else if(raw === "") {
		return { getter: null, prop: [] };
	}
	else {
		const [_, getter = "", rawSignature = ""] = raw.match(REG_GETTER_KIT);
		return { getter, prop: rawSignature.split(",").filter(Boolean) };
	}
}

function slot( { key, acid } ) {
	const res = document.createElement("slot");
	res.setAttribute("acid", acid);
	return res;
}

function img(key) {
	const res = document.createElement("slot");
	res.setAttribute("img", key);
	return res;
}

/**
 *
 * @param node
 * @param {String} name
 * @returns {boolean}
 */
function is( node, name ) {
	name = name.toUpperCase();
	return [ `M2-${name}`, name ].includes( node.tagName.toUpperCase() );
}

function byTagName(tagName) {
	tagName = tagName.toUpperCase();
	return node => node.tagName.toUpperCase() === tagName;
}

function byAttr(attrName, attrValue) {
	return node => node.getAttribute(attrName) === attrValue;
}

//the workaround is tied to the querySelectorAll,
// since it is used to extract replacement slots
function parseChildren(next, { resources, path, key }, src) {
	if(is( next, "unit" )) {
		const parser = HTMLView.parse(next, src, { pack: src.prop.pack });
		const _slot = slot( parser );
		parser.prop.template ? next.remove() : next.replaceWith( _slot );
		return [ parser ];
	}
	else if(is( next, "plug" )) {
		const parser = HTMLView.parse(next, src, {
			key, path, type: "custom", pack: src.prop.pack
		});
		const _slot = slot( parser );
		parser.prop.template ? next.remove() : next.replaceWith( _slot );
		return [ parser ];
	}
	else if (next.tagName === "IMG") {
		const key = UNIQUE_IMAGE_KEY ++;
		const _slot = img( key );
		next.replaceWith( _slot );
		resources.push(
			resource(src.prop.pack, { key, origin: next, type: "img", url: next.getAttribute("src") })
		);
		return [];
	}
	else if(next.tagName === "STYLE") { }
	return [...next.children].reduce( (acc, node) =>
			[...acc, ...parseChildren(node, { resources, path, key }, src)]
		, []);
}