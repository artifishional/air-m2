import { stream } from "air-stream"
import { NODE_TYPES } from "./def"
import { animate } from "air-gsap"

class NumberFormat {
	
	constructor( locale, { splitter = null, ...options } = {} ) {
		/*if(splitter) {
			locale = "ru";
		}*/
		this.formatter = new Intl.NumberFormat( locale, options );
		this.splitter = splitter;
	}
	
	format(num) {
		let format = this.formatter.format(num);
		/*if(this.splitter) {
			format = format.replace( ",", this.splitter );
		}*/
		return format;
	}
	
}

function gtemplate(str = "", ct = 0) {
	const len = str.length;
	let res = [];
	let srt = 0;
	let pfx = 0;
	let layer = 0;
	while (ct < len) {
		if(str[ct] === "{") {
			if(!layer) {
				if(pfx < ct) {
					res.push( { type: "other", vl: str.substring(pfx, ct) } );
				}
				srt = ct;
			}
			layer ++ ;
		}
		if(str[ct] === "}") {
			if(layer > 0) {
				layer -- ;
			}
			if(!layer) {
				pfx = ct+1;
				res.push( { type: "template", vl: str.substring(srt, pfx) } );
			}
		}
		ct ++ ;
	}
	if(pfx < ct) {
		res.push( { type: "other", vl: str.substring(pfx, ct) } );
	}
	return res;
}

function gtargeting(parent, res = []) {
	[...parent.childNodes].map(node => {
		if(node.tagName === "style") { }
		else if(node.nodeType === 3) {
			const nodes = gtemplate(node.nodeValue)
				.map( ({ vl, type }) => ({ vl, type, target: new Text(vl) }) );
			const targeting = nodes.filter(({type}) => type === "template");
			res.push(...targeting);
			if(targeting.length) {
				node.before(...nodes.map(({target}) => target));
				node.remove();
			}
		}
		else if(node.nodeType === 1) {
			gtargeting(node, res);
		}
	});
	return res;
}

function getfrompath(argv, path) {
	return path.reduce((argv, name) => {
		if(argv && argv.hasOwnProperty(name)) {
			return argv[name];
		}
		else {
			return null;
		}
	}, argv);
}

function templater(vl, intl = null, argv, resources) {
	if(vl.indexOf("intl") === 1) {
		if(!intl) return null;
		const [_, name, template] = vl.match(/^{intl.([a-zA-Z0-9_\-]+),(.*)}$/);
		const format = resources.find(({ type, name: x }) => type === "intl" && name === x).data;
		format.currency = format.currency || intl.currency;
		if(!isNaN(+template)) {
			const formatter = new NumberFormat(intl.locale, format);
			return formatter.format(+template);
		}
		else if(template.indexOf("argv") === 0) {
			const res = templater(`{${template}}`, intl, argv, resources);
			if(res !== null) {
				const formatter = new NumberFormat(intl.locale, format);
				return formatter.format(res);
			}
			return null;
		}
		else {
			const formatter = new NumberFormat(intl.locale, {
				...format,
				minimumIntegerDigits: 1,
				minimumFractionDigits: 0,
				maximumFractionDigits: 0,
			});
			const templates = gtemplate(template).map( ({ vl, type }) => {
				if(type === "template") {
					return templater(vl, intl, argv, resources);
				}
				else {
					return vl;
				}
			} );
			if(templates.some(x => x === null)) {
				return null;
			}
			return formatter.format(0).replace( "0", templates.join("") );
		}
	}
	else if(vl.indexOf("argv") === 1) {
		let [_, name] = vl.match(/^{argv((?:\.[a-zA-Z0-9_\-]+)*)}$/);
		name = name || DEFAULT;
		const path = name.split(".").filter(Boolean);
		const str = getfrompath(argv, path);
		if(str && str[0] === "{" && str.slice(-1)[0] === "}") {
			return templater(str, intl, argv, resources);
		}
		else {
			return str;
		}
	}
	else if(vl.indexOf("lang") === 1) {
		if(!intl) return null;
		
		const [_, name] = vl.match(/^{lang\.([a-zA-Z0-9_\-]+)}$/);
		const template = resources.find(({ type, name: x }) => type === "lang" && name === x).data[intl.locale];
		
		const templates = gtemplate(template).map( ({ vl, type }) => {
			if(type === "template") {
				return templater(vl, intl, argv, resources);
			}
			else {
				return vl;
			}
		} );
		if(templates.some(x => x === null)) {
			return null;
		}
		return templates.join("");
	}
	throw "unsupported template type";
}

function checkModelNecessity({ layer, targets }) {
	return [
		layer.prop.handlers.length,
		layer.prop.keyframes.filter( ([ name ]) => !["fade-in", "fade-out"].includes(name) ).length,
		targets.filter( ({ nodeType }) => nodeType === NODE_TYPES.TEXT_NODE ).length,
	]
		.some( x => x )
}

export default class Layer {

	createAnimateStream( keyframes ) {
		return animate( this, keyframes );
	}

    constructor( layer, { schema: { model } }, { targets, resources }) {
        //super( owner, { stream: { model, view, update }, targets } );
		this.animateStream = this.createAnimateStream( layer.prop.keyframes );
        this.layer = layer;
		this.loaderTimeoutID = null;
        this.schema = { model };
        this.resources = resources;
        this.targets = targets;
        this.state = { stage: 0 };
		this.layer.prop.handlers.map( ({ name }) => {
			if(name === "clickoutside") {
				window.addEventListener("click", this, false);
			}
			else if(name === "globalkeydown") {
				window.addEventListener("keydown", this, false);
			}
			else if(name === "globalkeyup") {
				window.addEventListener("keyup", this, false);
			}
			else {
				this.targets
					.filter( ( { nodeType } ) => nodeType === NODE_TYPES.ELEMENT_NODE )
					.map( target => target.addEventListener(name, this, false) )
			}
		});
        this.stream = stream( (emt, { sweep }) => {
			this.loaderTimeoutID = setTimeout( () =>
				console.warn(`too long loading layer`, this.layer), 5000
			);
			sweep.add(this.animateHandler = this.animateStream.at( () => {} ));
			if(checkModelNecessity( { layer, targets } )) {
				sweep.add( this.handler = model.obtain().at( (data) => {
					!this.state.stage && this.complete(emt);

					let state, action = "*";
					if(Array.isArray(data) && data.length < 3) {
						[state, action = "*"] = data;
					}
					else {
						state = data;
					}

					this.animateHandler( { data: [ state, action ] } );
					
				} ) );
			}
			else {
				this.complete(emt);
			}
			sweep.add( () => this.clear() );
		} );
    }

	complete(emt) {
		clearTimeout(this.loaderTimeoutID);
		this.state = {...this.state, stage: 1};
		emt([this.state, {action: "complete", data: null}]);
	}

	handleEvent(event) {
		if(event.currentTarget === window) {
			if(
				event.type === "click" &&
				this.handlers.find( ({name}) => name === "clickoutside" )
			) {
				if(this.targets.some( target =>
					event.target !== target && !target.contains(event.target) )
				) {
					this.handleEvent(new MouseEvent("clickoutside", event));
				}
			}
			if(
				event.type === "keydown" &&
				this.handlers.find( ({name}) => name === "globalkeydown" )
			) {
				this.handleEvent(new KeyboardEvent("globalkeydown", event));
			}
			if(
				event.type === "keyup" &&
				this.handlers.find( ({name}) => name === "globalkeyup" )
			) {
				this.handleEvent(new KeyboardEvent("globalkeyup", event));
			}
		}
		else {
			this.handlers.find( ({ name }) => event.type === name ).hn.call(
				event.target,
				event,
				this.props,
				({...args} = {}) => this.handler({ dissolve: false, ...args }),
				this.key
			);
		}
	}
    
    update( argv ) {
    	this.targets.map( ({ node }) => {
            if(node.nodeType === NODE_TYPES.TEXT_NODE) {
	            templater( node.textContent, argv, this.intl, this.resources );
            }
        } );
    }
    
    clear() {
		this.layer.prop.handlers.map( ({ name }) => {
			if(name === "clickoutside") {
				window.removeEventListener("click", this, false);
			}
			else if(name === "globalkeydown") {
				window.removeEventListener("keydown", this, false);
			}
			else if(name === "globalkeyup") {
				window.removeEventListener("keyup", this, false);
			}
			else {
				this.targets
					.filter( ( { nodeType } ) => nodeType === NODE_TYPES.ELEMENT_NODE )
					.map( target => target.removeEventListener(name, this, false) )
			}
		});
		clearTimeout(this.loaderTimeoutID);
	}

}