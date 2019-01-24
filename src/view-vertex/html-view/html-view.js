import { stream, combine } from "air-stream"
import { routeNormalizer, routeToString } from "../../utils"
import events from "../events"
import JSON5 from "json5"
import { LiveSchema } from "../../live-schema"
import resource from "../../loader/resource"

const CUT_FRAMES_REG = /\[\s*["'](.+?)["']\s*,((?:\s*{.+?}\s*,\s*)?\s*(?:\[.+?]))\s*]/gs;
let UNIQUE_VIEW_KEY = 0;




export default class HTMLView extends LiveSchema {
	
	constructor( args, src, { createEntity = null } = {} ) {
		super( args, src );
		createEntity && (this.createEntity = createEntity);
		this.prop.source.schtype = this.prop.source.schtype || "html";
		this.prop.node = this.prop.node || document.createDocumentFragment();
	}

	createEntity( { modelschema, ...args } ) {
		if(this.prop.tee || !this.prop.preload) {
			return this.createTeeEntity( { modelschema, ...args } );
		}
		else {
			return this.createTeeEntity( { modelschema, ...args } );
		}
	}

	createTeeEntity( { modelschema, ...args } ) {
		return stream( (emt, { sweep, hook }) => {

			let state = { stage: 0, target: null };
			let reqState = { stage: 1 };
			let loaderTarget = null;
			let loaderHook = null;

			const localName = typeof this.key === "object" ? JSON.stringify(this.key) : this.key;
			const target = document.createDocumentFragment();
			const begin = document.createComment(`BEGIN TEE ${localName} BEGIN`);
			const end = document.createComment(`END TEE ${localName} END`);
			target.prepend(begin);
			target.append(end);

			if(!this.prop.preload) {

				sweep.add( loaderHook = this.obtain( "#loader" )
					.at( ([ { stage, target } ]) => {
						if(state.stage === 0 && stage > 0) {
							loaderTarget = target;
							state = { ...state, stage: 1, };
							begin.after( target );
							emt( [ state ] );
						}
					} )
				);

			}

			sweep.add( this.createNodeEntity({ modelschema, ...args })
				.at( ([ { target } ]) => {
					if(reqState && reqState.stage === 1) {

						if(this.prop.preload) {
							sweep.force(loaderHook);
							loaderTarget && loaderTarget.remove();
						}

						reqState = null;
						state = { stage: 1, ...state };

						emt( [ state ] );
					}
				} )
			);


		});
	}

	createNodeEntity( { modelschema, ...args } ) {

		return stream( (emt, { sweep, hook }) => {
			
			let state = { stage: 0, target: null };
			let reqState = { stage: 1 };

			const resourcesStream = combine( this.prop.resources );
			//resourcesStream.at( ( resources ) => { } );

			const target = document.createDocumentFragment();
			target.append( ...this.layers.map( ({ prop: { node } }) => node.cloneNode(true) ) );

			state.target = target;

			//const target = this.prop.node.cloneNode( true );
			
			const localName = typeof this.key === "object" ? JSON.stringify(this.key) : this.key;
			
			const begin = document.createComment(`BEGIN NODE ${localName} BEGIN`);
			const end = document.createComment(`END NODE ${localName} END`);
			
			target.prepend(begin);
			target.append(end);
			
			const chidrenStream = combine(
				this.item
					.filter( ({ prop: { template } }) => !template )
					.map(x => x.obtain( "", { modelschema } ))
			);

			const commonStream = combine( [ chidrenStream, resourcesStream ] );
			sweep.add( commonStream.at( ([ children ]) => {
				if(reqState && reqState.stage === 1) {

					if(this.preload) {
						sweep.force(loaderHook);
						loaderTarget && loaderTarget.remove();
					}

					reqState = null;
					state = { stage: 1, ...state };

					const slots = target.querySelectorAll(`M2-SLOT`);
					const _children = children.map( ( [{ target }] ) => target );
					if(slots.length) {
						_children.map( (target, index) => {
							slots[index].replaceWith( target );
						} );
					}
					else {
						begin.after( ..._children );
					}

					emt( [ state ] );
				}
			} ));

		
		} );
	}
	
	parse(node, src, { pack } ) {
		return this.constructor.parse( node, src, { pack } );
	}
	
	static parse( node, src, { pack, type = "unit" } ) {
		
		if(!(node instanceof Element)) {
			return new HTMLView( ["", {}], src, { createEntity: node } );
		}
		
		const { path = "./", key: pkey = ++UNIQUE_VIEW_KEY+"" } = (src || {}).prop || {};
		
		let key = node.getAttribute("key");
		
		if(key !== null) {
			if(/[`"'{}\]\[]/.test(key)) {
				key = JSON5.parse(key);
			}
		}
		else {
			key = pkey;
		}
		
		const handlers = [ ...node.attributes ]
			.filter( ({ name }) => events.includes(name) )
			.map( ({ name, value }) => ({
				name: name.replace(/^on/, ""),
				hn: new Function("event", "options", "request", "key", value )
			}) );
		
		let stream = node.getAttribute("stream");
		stream = stream && routeNormalizer(stream.toString()) || { route: [] };
		stream.route = stream.route.map( seg => seg === "$key" ? key :  seg );
		Object.keys( stream ).map( prop => stream[prop] === "$key" && (stream[prop] = key) );
		stream = routeToString(stream);
		
		const template = ["", "true"].includes(node.getAttribute("template"));
		const id = node.getAttribute("id") || "$";
		let use = (node.getAttribute("use") || "").trim();
		let [ , source = null ] = use && use.match( /^url\((.*)\)$/ ) || [];
		source && (use = null);
		source = source && { path: source, schtype: type === "custom" ? "js" : "html" } || {};
		
		const keyframes = [];

        const resources =
            [ ...src && src.prop.resources || [], ...JSON5
                .parse(node.getAttribute("resources") || "[]")
                .map( x => resource(pack, x) )
            ]

        const tee = null;
        const preload = [!tee && null, "", "true"].includes(node.getAttribute("tee"));

		const prop = {
            tee,            //switch mode
            preload,        //must be fully loaded before readiness
            pack,           //current package
			keyframes,      //animation ( data ) settings
			use,            //reused templates path
			template,       //template node
			id,             //tree m2 advantages id
			type,           //view node type [node -> unit, switcher -> tee]
			source,         //m2 advantages source path if module
			handlers,       //event handlers
			path,           //absolute path
			node,           //xml target node
			key,            //inherited or inner key
			model: stream,  //link to model stream todo obsolete io
			resources,      //related resources
		};
		
		const res = src && src.lift( [ key, prop ], src ) || new HTMLView( [ key, prop ], src );
		
		[...node.childNodes].map( next => setup( next, res.prop ));
		
		res.append(...[...node.children].reduce((acc, next) =>
				[...acc, ...parseChildren( next, res.prop, res )]
			, []));
		
		res.prop.node = document.createDocumentFragment();
		res.prop.node.append( ...node.children );

		return res;
		
	}
	
	mergeProperties( name, value ) {
		if(["node", "template", "pack", "source"].includes(name)) {
			return this.prop[name];
		}
		else {
			return super.mergeProperties( name, value );
		}
	}
	/*
		targeting() {
			return [...this.node.querySelectorAll( "SETUP,M2-SETUP" )]
				.map(node => {
					const keyframes = JSON5.parse(node.getAttribute("keyframes") || "[]");
					let props = node.getAttribute("props");
					if (props) {
						const cdc = new Function("key", "argv", `{return ${props}}`);
						props = argv => cdc(key, argv);
					}
					node.remove();
					return { node, keyframes, props };
				});
		}*/
	
}

function setup( next, { keyframes } ) {
	if(next.nodeType === 3 && !is( next.parentNode, "setup" )) {
		const templates = next.nodeValue.match(/{(?:intl|lang|argv).+?}/g);
		templates && next.replaceWith( ...templates.map(
			text => {
				const res = document.createElement("setup");
				res.textContent = text;
				return res;
			}
		));
	}
	if(is( next, "setup" )) {
		if(!is( next.parentNode.parentNode, "unit" ) ) {
			const replaced = next.parentNode;
			const unit = document.createElement("unit");
			replaced.replaceWith( unit );
			unit.append( replaced );
		}
		else {
			
			if(next.textContent) {
				if(!keyframes.find(([name]) => name === "*")) {
					keyframes.push( [ "*", [ 100 ] ] );
				}
			}
			
			let keyframesAttribute = next.getAttribute("keyframes");
			if(keyframesAttribute) {
				
				if(keyframesAttribute.indexOf("[") < 0) {
					keyframesAttribute = `[[ "*", {}, [100, ${keyframesAttribute}]]]`
				}
				
				keyframesAttribute.replace(CUT_FRAMES_REG, (all, action, fn) => {
					let exist = keyframes.findIndex(([x]) => x === action);
					if(exist < 0) {
						exist = keyframes.length;
					}
					const handler = new Function("argv", `return ["${action}", ${fn}]`);
					keyframes[exist] = [ action, ({argv} = {}) => handler(argv) ];
				});
				
			}
			
		}
	}
	return [...next.childNodes].map( node =>
		!is( node, "unit" ) && setup(node, { keyframes })
	);
}

function slot( ) {
	return document.createElement("M2-SLOT");
}

function img() {
	return document.createElement("M2-RES");
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
		const _slot = slot( );
		parser.prop.template ? next.remove() : next.replaceWith( _slot );
		return [ parser ];
	}
	else if(is( next, "plug" )) {
		const parser = HTMLView.parse(next, src, {
			key, path, type: "custom", pack: src.prop.pack
		});
		const _slot = slot( );
		parser.prop.template ? next.remove() : next.replaceWith( _slot );
		return [ parser ];
	}
	else if (next.tagName === "IMG") {
		const _slot = img( );
		next.replaceWith( _slot );
		resources.push( { type: "img", url: next.getAttribute("src") } );
		return [];
	}
	else if(next.tagName === "STYLE") { }
	return [...next.children].reduce( (acc, node) =>
			[...acc, ...parseChildren(node, { resources, path, key }, src)]
		, []);
}