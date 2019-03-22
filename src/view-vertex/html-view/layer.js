import { stream } from "air-stream"
import { animate } from "air-gsap"
import { combine } from "air-m2"

function checkModelNecessity({ layer, targets }) {
	return [
		layer.prop.handlers.length,
		layer.prop.keyframes.filter( ([ name ]) => !["fade-in", "fade-out"].includes(name) ).length,
		targets.filter( ({ type }) => type === "data" ).length,
	]
		.some( x => x )
}

export default class Layer {

	createAnimateStream( { keyframes, targets } ) {
		return animate( this, { keyframes, targets }, this.layer.prop.key );
	}

    constructor( layer, { schema }, { targets, resources }) {

		this.layer = layer;

		//super( owner, { stream: { model, view, update }, targets } );
		this.animateStream = this.createAnimateStream( { ...layer.prop, targets } );
		this.loaderTimeoutID = null;
        this.schema = schema;
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
					.filter( ( { type } ) => type === "active" )
					.map( ({ node }) => node.addEventListener(name, this, false) )
			}
		});
        this.stream = stream( (emt, { sweep, hook }) => {

			hook.add( ({action}) => {
				if(action === "fade-in") {
					this.animateHandler({ intl: null, data: [ {}, { action: "fade-in" } ] });
					this.state = { ...this.state, stage: 2 };
					emt.kf();
					emt( [ this.state ] );
				}
				else if(action === "fade-out") {
					this.animateHandler({ intl: null, data: [ {}, { action: "fade-out" } ] });
				}
			} );

			this.loaderTimeoutID = setTimeout( () =>
				console.warn(`too long loading layer`, this.layer), 5000
			);
			sweep.add(this.animateHandler = this.animateStream.at( ({ action }) => {
				if(action === "fade-out-complete") {
					this.state = { ...this.state, stage: 1 };
					emt.kf();
					emt( [ this.state ] );
				}
			} ));
			if(checkModelNecessity( { layer, targets } )) {
				sweep.add( this.handler = combine([
					this.schema.model.layer.obtain("", this.schema.model.vars),
					this.schema.model.layer.obtain("#intl"),
				]).at( ([data, intl]) => {
					!this.state.stage && this.complete(emt);

					let state, action = "default";
					if(Array.isArray(data) && data.length < 3) {
						[state, action = "default"] = data;
					}
					else {
						state = data;
					}

					this.animateHandler( { intl, data: [ state, action ] } );
					
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
		this.state = { ...this.state, stage: 1 };
		emt.kf();
		emt([this.state, {action: "complete", data: null}]);
	}

	handleEvent(event) {
		if(event.currentTarget === window) {
			if(
				event.type === "click" &&
				this.layer.prop.handlers.find( ({name}) => name === "clickoutside" )
			) {
				if(this.targets.some( ({ node }) =>
					event.target !== node && !node.contains(event.target) )
				) {
					this.handleEvent(new MouseEvent("clickoutside", event));
				}
			}
			if(
				event.type === "keydown" &&
				this.layer.prop.handlers.find( ({name}) => name === "globalkeydown" )
			) {
				this.handleEvent(new KeyboardEvent("globalkeydown", event));
			}
			if(
				event.type === "keyup" &&
				this.layer.prop.handlers.find( ({name}) => name === "globalkeyup" )
			) {
				this.handleEvent(new KeyboardEvent("globalkeyup", event));
			}
		}
		else {
			this.layer.prop.handlers.find( ({ name }) => event.type === name ).hn.call(
				event.target,
				event,
				this.props,
				null, //({...args} = {}) => this.handler({ dissolve: false, ...args }),
				this.layer.prop.key,
				(action, {...args} = {}) => this.handler({ dissolve: false, action, ...args }),
			);
		}
	}
    
    update( argv, intl ) {
    	this.targets.map( target => target.update( argv, intl, this.resources ) );
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
					.filter( ( { type } ) => type === "active" )
					.map( ({ node }) => node.removeEventListener(name, this, false) )
			}
		});
		clearTimeout(this.loaderTimeoutID);
	}

}