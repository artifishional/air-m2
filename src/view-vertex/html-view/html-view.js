import { stream, combine } from "air-stream"
import { routeNormalizer, routeToString } from "../../utils"
import events from "../events"
import JSON5 from "json5"
import { LiveSchema } from "../../live-schema"

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
		return stream( emt => {
			
			const target = document.createDocumentFragment();
			target.append( ...this.layers.map( ({ prop: { node } }) => node.cloneNode(true) ) );
			
			//const target = this.prop.node.cloneNode( true );
			
			const localName = typeof this.key === "object" ? JSON.stringify(this.key) : this.key;
			
			const begin = document.createComment(`BEGIN ${localName} BEGIN`);
			const end = document.createComment(`END ${localName} END`);
			
			target.prepend(begin);
			target.append(end);
			
			combine(this.item
				.filter( ({ prop: { template } }) => !template )
				.map(x => x.obtain( "", { modelschema } ))).at( (evt) => {
				
				const slots = target.querySelectorAll(`M2-SLOT`);
				
				const children = evt.map( ( { node: { target } } ) => target );
				if(slots.length) {
					children.map( (target, index) => {
						slots[index].replaceWith( target );
					} );
				}
				else {
					begin.after( ...children );
				}
				
				
				emt( { action: "complete", node: { target } } );
			
			} );
		
		} );
	}
	
	parse(node, src) {
		return this.constructor.parse( node, src );
	}
	
	static parse( node, src, {
		type = "node",
	} = {} ) {
		
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
		
		const resources = JSON5.parse(node.getAttribute("resources") || "[]");
		
		let stream = node.getAttribute("stream");
		stream = stream && routeNormalizer(stream.toString()) || { route: [] };
		stream.route = stream.route.map( seg => seg === "$key" ? key :  seg );
		Object.keys( stream ).map( prop => stream[prop] === "$key" && (stream[prop] = key) );
		stream = routeToString(stream);
		
		const template = ["", "false"].includes(node.getAttribute("template"));
		const id = node.getAttribute("id") || "$";
		let use = (node.getAttribute("use") || "").trim();
		let [ , source = null ] = use && use.match( /^url\((.*)\)$/ ) || [];
		source && (use = null);
		source = source && { path: source, schtype: type === "custom" ? "js" : "html" } || {};
		
		const keyframes = [];
		
		const prop = {
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
		if(["node", "template", "node"].includes(name)) {
			return this.prop.node;
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
		const parser = HTMLView.parse(next, src);
		const _slot = slot( );
		parser.prop.template ? next.remove() : next.replaceWith( _slot );
		return [ parser ];
	}
	else if(is( next, "plug" )) {
		const parser = HTMLView.parse(next, src, {
			key, path, type: "custom"
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