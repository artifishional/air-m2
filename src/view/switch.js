import { stream, combine } from "air-stream"
import { equal } from "../utils"

const statesstream = (scenesstream, { modelstream, viewbuilder, baseresources }) =>

    stream( (emt, { sweep }) => {

        sweep.add(combine([scenesstream, modelstream]).at(
            ([ { advantages: sceneschema }, {advantages: modelschema} ]) => {
                const { key, args: { model, childrenmodel = "", ...args } } = sceneschema;
	
	            const child = viewbuilder({key, ...args});
                
                let curstate = null;
                let requirestatehook = null;
                let loadertimeout = null;
                let requirestatestream = null;
                let curChild = null;

                const loaderstream = sceneschema.obtain("#loader");

                sweep.add( loaderstream.at( ({action, node}, src) => {

                    if(action === "complete") {
	
	                    child.add( curChild = node );
                        emt( { action: "complete", node: child }, src );

                        sweep.add(modelschema.obtain(model).at( ( data ) => {

                            let action, key;

                            if(Array.isArray(data)) {
                                [ action, { key = null } ] = data;
                            }
                            else {
                                ({ action, key = null } = data);
                                if(Array.isArray(action)) {
                                    [action, { key = null } ] = action;
                                }
                            }

                            if(key === undefined) {
                                throw new TypeError(`parm 'key' is undefined`);
                            }

                            if(action === "change" && !equal(curstate, key)) {
                                clearTimeout(loadertimeout);
                                loadertimeout = setTimeout(() => {
                                    curstate = null;
                                    //emt( { stream: loaderstream, key: "loader", node } )
	                                curChild.remove();
	                                child.add( curChild = node );
                                } , 100);

                                requirestatehook && sweep.force( requirestatehook );
                                requirestatestream = sceneschema._obtain( {
                                    baseresources,
                                    route: [ key ],
                                    modelschema: modelschema.get(model + childrenmodel),
                                } );
	
	                            requirestatestream.$key = key;
                                
                                sweep.add(requirestatehook = requirestatestream.at( ({action, node}) => {

                                    if(action === "complete") {
                                        clearTimeout(loadertimeout);
                                        curstate = key;
	
	                                    requirestatehook( { key, action: [ "fade-in" ]} );
	
	                                    curChild.remove();
	                                    child.add( curChild = node );
	                                    
                                        //emt( { stream: requirestatestream, key, node } );
                                        
                                    }

                                } ));

                            }

                        } ));

                    }

                } ) );

            })
        );

    } );

export default statesstream;

/*
export default (scenesstream, { modelstream, viewbuilder, baseresources }) =>

    stream( (emt, { sweep, hook }) => {

        hook.add(({action}) => {
            emt({action: `${action}-complete`,});
        });

        sweep.add(scenesstream.at( ({ advantages: {key, args: { frames = [], ...args }} }) => {

            const child = viewbuilder({key, ...args});

            const reactions = frames.filter(([name]) => !["fade-in", "fade-out"].includes(name));
            if (reactions.length) {
                sweep.add(modelstream.at( ( {advantages: modelschema} ) => {
                    const hook = animate(view, ["frames", ...reactions], key).on(() => { });
                    sweep.add(hook);
                    sweep.add(modelschema.obtain(model).at(hook));
                } ));
            }

            let curstate = null;
            let curstatehook = stream((emt, { hook }) =>
                hook.add(({action: [action]}) => emt( { key: "pre",  action: `${action}-complete` } ))
            ).at( handle );
            sweep.add(curstatehook);
            let curstatenode = viewbuilder( { key: "blank" } );
            child.add(curstatenode);
            let stage = "idle";
            let requirestate = null;
            let requirestatehook = null;
            let newstatenode = null;

            let loaded = false;

            function handle( { action, node, key, stream } ) {
                if(action === "fade-out-complete") {
                    sweep.force(curstatehook);
                    curstatehook = requirestatehook;
                    //sweep.add(curstatehook = requirestatehook);
                    stage = "idle";
                    //child.removeChild( curstatenode.remove() );
                    curstatenode.remove();
                    curstatenode.clear();
                    //child.addChild( newstatenode );
                    child.add( newstatenode );
                    curstatenode = newstatenode;
                    curstate = requirestate;
                    requirestate = null;
                    curstatehook( { key, action: [ "fade-in" ]} );
                }
                else if(action === "complete" && stream === requirestate) {
                    newstatenode = node;
                    stage = "fade-out";
                    curstatehook( { key, action: [ "fade-out" ]} );
                    if(!loaded) {
                        emt( { key, action: "complete", node: child} );
                        loaded = true;
                    }
                }
            }

            sweep.add(statesstream( scenesstream, { modelstream, baseresources } ).at( ({ stream, key, node }) => {
	
	            console.log( node.getAttribute("db-name"), stream.$key );
	
	            
	            
	            function handle( { action, node, key, stream } ) {
		            if(action === "fade-out-complete") {
			            sweep.force(curstatehook);
			            curstatehook = requirestatehook;
			            //sweep.add(curstatehook = requirestatehook);
			            stage = "idle";
			            //child.removeChild( curstatenode.remove() );
			            curstatenode.remove();
			            curstatenode.clear();
			            //child.addChild( newstatenode );
			            child.add( newstatenode );
			            curstatenode = newstatenode;
			            curstate = requirestate;
			            requirestate = null;
			            curstatehook( { key, action: [ "fade-in" ]} );
		            }
		            else if(action === "complete" && stream === requirestate) {
			            newstatenode = node;
			            stage = "fade-out";
			            curstatehook( { key, action: [ "fade-out" ]} );
			            if(!loaded) {
				            emt( { key, action: "complete", node: child} );
				            loaded = true;
			            }
		            }
	            }
        
            } ));

        } ));

    });*/