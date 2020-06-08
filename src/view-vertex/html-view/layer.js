import { stream } from "air-stream"
import animate from "air-anime"

export { anime } from "air-anime"
export class BaseLayer {

	createAnimateStream( keyframes, targets ) {
		return animate( targets, keyframes, this.layer );
	}

	constructor(layer, { targets }) {
		//todo targets.length === 0 ?
		this.notObjectTargetType = targets.length && targets[0].type !== "data";
		this.keyframes = layer.prop.keyframes;
		this.fadeoutexist = this.keyframes.some(([ name ]) => name === "fade-out");
		this.layer = layer;
		this.targets = targets;
		this.state = { stage: 0 };
		if(targets.length) {
			this.animateStream = this.createAnimateStream( this.keyframes, targets );
		}
		this.stream = stream.fromCbFn((cb, ctr) => {
			ctr.req("fade-in", () => {
				//todo patch
				//target "data" type not allowed when animate fade-in/out
				if(this.notObjectTargetType && this.animateStream) {
					this.animateHandler({ data: [{}, { action: "fade-in" }] });
				}
				this.state = { ...this.state, stage: 2 };
				cb([this.state ]);
			});
			
			ctr.req("fade-out", () => {
				if(this.fadeoutexist && this.notObjectTargetType && this.animateStream) {
					this.animateHandler({ data: [ {}, { action: "fade-out" } ] });
				}
				else {
					this.state = { ...this.state, stage: 1 };
					cb([this.state]);
				}
			});
			
/*
			this.loaderTimeoutID = setTimeout( () =>
				console.warn(`too long loading layer`, this.layer), 5000
			);*/
			if(this.animateStream) {
				ctr.req("disconnect", this.animateHandler = this.animateStream.at(({ action }) => {
					if(action === "fade-out-complete") {
						this.state = { ...this.state, stage: 1 };
						cb([this.state]);
					}
				}));
			}
			this.sweep(cb, ctr);
			ctr.req("disconnect", () => this.clear());
		});
	}

	sweep(cb, ctr) {
		this.complete(cb);
	}

	clear() { }

	complete(cb) {
		//clearTimeout(this.loaderTimeoutID);
		this.state = { ...this.state, stage: 1 };
		cb([this.state, {action: "complete", data: null}]);
	}

}

export class Layer extends BaseLayer {

	sweep(sweep, emt) {
		if(this.checkModelNecessity( )) {
			//todo perf hack
			if(this.targets[0].type === "data") {
				sweep.add(this.schema.model.layer._obtain(["#intl"]).at(
					intl => this.targets.map(target => target.transition(intl))
				));
			}
			this.handler = this.schema.model.layer._obtain([], this.schema.model.vars).at((data) => {
				!this.state.stage && this.complete(emt);
				let state, action = "default";
				if (Array.isArray(data) && data.length < 3) {
					[state, action = "default"] = data;
				} else {
					state = data;
				}
				this.animateHandler({data: [state, action]});
			});
			sweep.add(this.handler);
		}
		else {
			this.complete(emt);
		}
	}

	constructor( layer, { schema }, { targets, resources }, { signature }) {

		super( layer, { targets } );
		
		this.signature = signature;

		this.loaderTimeoutID = null;
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
				(action, {...args} = {}) => this.handler({ dissolve: false, action, ...args }),
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