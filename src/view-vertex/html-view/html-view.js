import { stream, combine } from "air-stream"
import {routeNormalizer, routeToString, signature} from "../../utils"
import events from "../events"
import JSON5 from "json5"
import { LiveSchema } from "../../live-schema"
import resource from "../../loader/resource"
import { NODE_TYPES } from "./def"
import Layer from "./layer"
import PlaceHolderContainer from "./place-holder-container"
import ActiveNodeTarget from "./active-node-target"

const CUT_FRAMES_REG = /\[\s*["'](.+?)["']\s*,((?:\s*{.+?}\s*,\s*)?\s*(?:\[.+?]))\s*]/gs;
let UNIQUE_VIEW_KEY = 0;

export default class HTMLView extends LiveSchema {
	
	constructor( args, src, { acid, createEntity = null } = {} ) {
		super( args, src, { acid } );
		createEntity && (this.createEntity = createEntity);
		this.prop.stream = this.prop.stream || "";
		this.prop.handlers = this.prop.handlers || [];
		this.prop.tee = this.prop.tee || null;
		this.prop.keyframes = this.prop.keyframes || [];
		this.prop.node = this.prop.node || document.createDocumentFragment();
	}

	createActiveNodeTarget(node, resources) {
		return new ActiveNodeTarget(node, resources);
	}

	createEntity( { $: { modelschema,
		layers: layers = new Map( [ [ -1, { layer: modelschema, vars: {} } ] ] ) }, ...args }
	) {
		return stream( (emt, { sweep, over }) => {
			let state = { stage: 0, target: null, active: false };
			const clayers = new Map(this.layers.map(
				({ acid: _acid, src: { acid }, prop: { stream } }, i, arr) => {
					if(stream[0] === "^") {
						const eLayer =
							arr.slice(0, i).find( ({ prop: { stream } }) => stream[0] !== "^" );
						if(!eLayer) {
							throw `the first view layer cannot refer to the predecessor stream`
						}
						const { src: { acid }, prop: { stream: pstream } } = eLayer;
						
						//stream inheritance
						if(pstream === "" && !stream.substr(1)) {
							return [ _acid, {
								layer: layers.get(acid).layer.get(""),
								vars: layers.get(acid).vars,
							}];
						}
						
						return [_acid, {
							layer: layers.get(acid).layer.get( pstream + stream.substr(1) ),
							vars: routeNormalizer(pstream + stream.substr(1)),
						}];
					}
					if(stream === "") {
						return [ _acid, {
							layer: layers.get(acid).layer.get(stream),
							vars: layers.get(acid).vars,
						}];
					}
					else {
						return [_acid, {
							layer: layers.get(acid).layer.get(stream),
							vars: routeNormalizer(stream),
						}];
					}
				}
			));
			sweep.add( combine(
				[...clayers].map( ([, { layer } ]) => layer ),
				(...layers) => new Map([ ...clayers].map( ([ acid, { vars: { route, ...vars } } ], i) => [
					acid, { layer: layers[i], vars }
				] ))
			).at( ( layers ) => {
				if(this.layers.some( ({ prop: { tee } }) => tee ) || !this.prop.preload) {
					over.add(this.createTeeEntity( { $: { layers }, ...args } ).on(emt));
				}
				else {
					over.add(this.createNextLayers( { $: { layers }, ...args } ).on(emt));
				}
			} ) );
		} );
	}

	createLayer(owner, { targets, resources } ) {
		return new Layer( this, owner, { targets, resources } );
	}

	createNextLayers( { $: { layers }, ...args } ) {
		return stream( (emt, { sweep }) => {

			const container = new PlaceHolderContainer(this, { type: "layers" });

			let actives = [];
			let state = {
				acids: this.layers.map( ({ acid }) => acid ),
				acid: this.acid,
				stage: 0, container, 
				key: this.key, 
				target: container.target
			};
			
			sweep.add( () => actives.map( x => x.clear() ) );

			if(this.acid.indexOf("block") > -1) {
				debugger;
			}

			sweep.add( combine( [
				...this.layers.map( (layer) =>
					layer.createNodeEntity( { $: { container, layers }, ...args } )
				),
				this.createChildrenEntity( { $: { container, layers }, ...args } ),
			] ).at( (comps) => {
				const children = comps.pop();
				const { target } = container;
				container.append(...comps.map( ({ container: { target } }) => target));
				const slots = [ ...target.querySelectorAll(`slot[acid]`) ]
					.map( slot => ({
						acid: slot.getAttribute("acid"),
						slot,
					}) );

				if(children.length) {
					if(slots.length) {



						//if(_slots.size !== children.length) debugger;

						children.map( ([{ target, acids }]) => {

							const place = slots
								.filter( ({ acid }) => acids.includes(acid) )
								.reduce(( exist, {slot, acid} ) => {
								//const acid = slot.getAttribute("acid");

								if(!exist) {
									exist = slot;
									//cache.set(acid, slot);
								}
								else if(
									exist.parentNode.nodeType !== NODE_TYPES.ELEMENT_NODE &&
									slot.parentNode.nodeType === NODE_TYPES.ELEMENT_NODE
								) {
									exist.remove();
									exist = slot;
									//cache.set(acid, slot);
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
				sweep.add(combine(this.layers.map( ( layer, i ) => {
					return layer.createLayer(
						{ schema: { model: layers.get(layer.acid) } },
						{ resources: comps[i].resources,
							targets: [
								...comps[i].container.targets( "datas", comps[i].resources ),
								...container.targets("actives", comps[i].resources )
							],
						}
					).stream;
				} )).at( (layers) => {
					if(state.stage === 0 && layers.every( ([ { stage } ]) => stage === 1)) {
						state = { ...state, stage: 1 };
						emt( [ state ] );
					}
				} ));
			}) );
		} );
	}

	createNodeEntity( ) {
		return stream( (emt, { sweep }) => {
			sweep.add(combine( this.prop.resources ).at( ( resources ) => {
				const container = new PlaceHolderContainer( this, { type: "node" } );
				container.append(this.prop.node.cloneNode(true));
				const imgs = resources.filter(({type}) => type === "img");
				[...container.target.querySelectorAll(`slot[img]`)]
					.map((target, i) => target.replaceWith(imgs[i].image));
				emt( { resources, container } );
			}));
		});
	}

	teeSignatureCheck( layers ) {
		return this.layers.every( ({ acid, prop: { tee } }) => signature( tee, layers.get(acid) ) );
	}

	createTeeEntity( { $: { layers }, ...args } ) {

		const teeLayers = this.layers
			.filter( ({ prop: { tee } }) => tee )
			.map( ({ acid }) => acid );

		const teeStreamLayers = new Map([...layers].filter( ([acid]) => teeLayers.includes(acid) ));



		//выбрать те слои с данными, в которых присутсвует tee
		const modelschema = combine(
			[...teeStreamLayers].map( ([, { layer, vars } ]) => layer.obtain("", vars) ),
			(...layers) => layers.map( ly => Array.isArray(ly) ? ly[0] : ly )
		);

		return stream( (emt, { sweep, hook }) => {

			let state = {
				acids: this.layers.map( ({ acid }) => acid ),
				acid: this.acid, key: this.key, stage: 0, active: false, target: null
			};
			let reqState = { stage: 1 };
			let loaderTarget = null;
			let loaderHook = null;
			let childHook = null;

			const container = new PlaceHolderContainer( this, { type: "entity" } );
			state.target = container.target;
			state.container = container;

			if(!this.prop.preload) {
				sweep.add( loaderHook = this.obtain( "#loader" )
					.at( ([ { stage, target } ]) => {
						if(state.stage === 0 && stage > 0) {
							loaderTarget = target;
							state = { ...state, stage: 1, };
							container.append( target );
							emt( [ state ] );
						}
					} )
				);
			}

			let _inner = null;
			const view = this.createNextLayers( { $: { layers }, ...args } );
			sweep.add( modelschema.at( (data) => {


				//this.layers.filter( ({ prop: { tee } }) => tee )

				//const active = this.prop.tee.every(tee => signature(tee, data));

				const active = this.teeSignatureCheck( 
					new Map([ ...teeStreamLayers ].map( ([ acid ], i) => [acid, data[i]]) ) 
				);

				if(active !== state.active) {

					state = { ...state, active };
					if(active) {
						sweep.add( childHook = view
							.at( ([ { target, container: inner } ]) => {
								_inner = inner;
								container.begin.after( inner.target );
							} )
						);
					}
					else {
						_inner && _inner.restore();
						childHook && sweep.force( childHook );
						childHook = null;
					}
				}
			} ) );
			sweep.add( combine([ modelschema.ready(), view ]).at( ([ data ]) => {
				if(reqState && reqState.stage === 1) {
					if(!this.prop.preload) {
						sweep.force(loaderHook);
						loaderTarget && loaderTarget.remove();
					}
					reqState = null;
					state = { ...state, stage: 1,  };
					emt( [ state ] );
				}
			} ) );
		});
	}

	createChildrenEntity( { $: { container: { target, begin }, layers }, ...args } ) {
		return combine(
			this.item
				.filter( ({ prop: { template } }) => !template )
				.map(x => x.obtain( "", { $: { layers } } ))
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
			.filter( ({ name }) => events.includes(name) )
			.map( ({ name, value }) => ({
				name: name.replace(/^on/, ""),
				hn: new Function("event", "options", "request", "key", "req", value )
			}) );
		
		let stream = node.getAttribute("stream");
		stream = stream && routeNormalizer(stream.toString()) || { route: [] };
		stream.route = stream.route.map( seg => seg === "$key" ? key : seg );
		Object.keys( stream ).map( prop => stream[prop] === "$key" && (stream[prop] = key) );
		stream = routeToString(stream);

		const acid = node.getAttribute("acid") || "";

		const template = ["", "true"].includes(node.getAttribute("template"));
		const id = node.getAttribute("id") || "$";

		const use = pathParser( node.getAttribute("use") || "" );

        const resources =
            [ ...(src.acid !== -1 && src.prop.resources || []), ...JSON5
                .parse(node.getAttribute("resources") || "[]")
                .map( x => resource(pack, x) )
            ];
		
        const tee = cuttee(node, key);
        const preload = !["false"].includes(node.getAttribute("preload"));

		const keyframes = parseKeyFrames( { node } );

		const prop = {
            tee,            //switch mode
            preload,        //must be fully loaded before readiness
            pack,           //current package
			keyframes,      //animation ( data ) settings
			use,            //reused templates path
			template,       //template node
			id,             //tree m2 advantages id
			type,           //view node type [node -> unit, switcher -> tee]
			//source,         //m2 advantages source path if module
			handlers,       //event handlers
			path,           //absolute path
			node,           //xml target node
			key,            //inherited or inner key
			stream,         //link to model stream todo obsolete io
			resources,      //related resources
		};

		const res = src.acid !== -1 && src.lift( [ uvk, prop ], src, { acid } ) ||
			new HTMLView( [ uvk, prop ], src, { acid } );
		
		//[...node.childNodes].map( next => setup( next, res.prop ));

		res.append(...[...node.children].reduce((acc, next) =>
				[...acc, ...parseChildren( next, res.prop, res )]
			, []));
		
		res.prop.node = document.createDocumentFragment();
		res.prop.node.append( ...node.childNodes );

		return res;
		
	}
	
	mergeProperties( name, value ) {
		if(name === "stream") {
			return this.prop.stream;
		}
		/*else if(name === "template") {
			return this.prop.template || value;
		}*/
		/*else if( name == "tee" ) {
			return [ ...this.prop.tee, ...value];
		}*/
		else if(["key", "tee", "template", "handlers", "keyframes", "node", "pack", "source"].includes(name)) {

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

const REG_GETTER_ATTRIBUTE = /\([a-zA-Z_]{1}[a-bA-Z\-_0-9]*?\)/g;

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
					let offset = node.getAttribute("offset");
					let prop = node.getAttribute("prop");
					if(prop) {
						prop = prop.replace(REG_GETTER_ATTRIBUTE, (_, reg) => {
							return `(argv.${reg})`;
						});
						prop = new Function("argv", "ttm", `return ${prop}`);
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
	const rawTee = node.getAttribute("tee");
	if(rawTee === null) {
		return null;
	}
	else if(rawTee === "") {
		return key;
	}
	else if(rawTee[0] === "{") {
		return JSON5.parse(rawTee);
	}
	else {
		return rawTee;
	}
}

function slot( { key, acid } ) {
	const res = document.createElement("slot");
	res.setAttribute("acid", acid);
	return res;
}

function img() {
	const res = document.createElement("slot");
	res.setAttribute("img", "");
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
	return [ `M2-${name}`, name ].includes( node.tagName );
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
		const _slot = img( );
		next.replaceWith( _slot );
		resources.push(
			resource(src.prop.pack, { type: "img", url: next.getAttribute("src") })
		);
		return [];
	}
	else if(next.tagName === "STYLE") { }
	return [...next.children].reduce( (acc, node) =>
			[...acc, ...parseChildren(node, { resources, path, key }, src)]
		, []);
}