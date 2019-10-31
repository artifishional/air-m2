import animate from "air-anime"
import { stream2 } from "air-m2"

export class BaseLayer {

	createAnimateStream( { keyframes, targets } ) {
		return animate( targets, keyframes, this.layer );
	}

	constructor( layer, { targets } ) {
		this.layer = layer;
		this.targets = targets;
		this.state = { stage: 0 };
		//this.loaderTimeoutID = null;

		this.animateStream = this.createAnimateStream( { ...layer.prop, targets } );

		this.stream = stream2( null, (e, controller) => {
			/*this.loaderTimeoutID = setTimeout( () =>
				console.warn(`too long loading layer`, this.layer), 5000
			);*/
			
			this.animateStream.connect( hook => {
				
				this.animateHandler = hook;
				controller.todisconnect(hook);
				
				controller.tocommand( ({action}) => {
					if(action === "fade-in") {
						this.animateHandler({ data: [ {}, { action: "fade-in" } ] });
						this.state = { ...this.state, stage: 2 };
						e( [ this.state ] );
					}
					else if(action === "fade-out") {
						this.animateHandler({ data: [ {}, { action: "fade-out" } ] });
					}
				} );
				
				controller.todisconnect( () => this.clear() );
				
				this.controller( controller, e );
				
				return ({ action }) => {
					if(action === "fade-out-complete") {
						this.state = { ...this.state, stage: 1 };
						e( [ this.state ] );
					}
				}
			} );
			
		} )
			.store();

	}
	
	controller(controller, e) {
		this.complete(e);
	}

	clear() { }

	complete(e) {
		//clearTimeout(this.loaderTimeoutID);
		this.state = { ...this.state, stage: 1 };
		e([this.state, {action: "complete", data: null}]);
	}

}

export class Layer extends BaseLayer {
	
	controller( controller, e ) {
		if(this.checkModelNecessity( )) {
			stream2.combine([
				this.schema.model.layer._obtain( [], this.schema.model.vars ),
				this.schema.model.layer._obtain( ["#intl"] ),
			]).connect( hook => {
				controller.todisconnect( this.handler = hook );
				return ([data, intl]) => {
					this.targets.map( target => target.transition(intl) );
					!this.state.stage && this.complete(e);
					let state, action = "default";
					if(Array.isArray(data) && data.length < 3) {
						[state, action = "default"] = data;
					}
					else {
						state = data;
					}
					this.animateHandler( { data: [ state, action ] } );
				}
			} );
		}
		else {
			this.complete(e);
		}
	}

	constructor( layer, { schema }, { targets, resources }, { signature }) {

		super( layer, { targets } );
		
		this.signature = signature;
		
        this.schema = schema;
        this.resources = resources;

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

		this.stream = this.layer.prop.plug.reduce( (acc, plug) => {
			return plug( {
				obtain: (path = "", vars = {}) =>
					schema.model.layer.obtain(path, { ...schema.model.vars, ...vars }),
				source: acc,
				schema,
				resources,
				targets
			} );
		}, this.stream );

    }

	checkModelNecessity() {
		return [
			this.layer.prop.handlers.length,
			this.layer.prop.keyframes.some( ([ name ]) => !["fade-in", "fade-out"].includes(name) ),
			this.targets.some( ({ type }) => type === "data" ),
		]
			.some( Boolean )
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
				this.layer.prop,
				null, //({...args} = {}) => this.handler({ dissolve: false, ...args }),
				this.layer.prop.key,
				this.signature,
				(action, args) => this.handler(action, args),
			);
		}
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
	}

}