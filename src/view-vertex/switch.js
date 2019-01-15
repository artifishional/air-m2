import { stream, combine } from "air-stream"
import { equal } from "../utils"

const statesstream = ( scenesstream, {
    parent: { modelstream: pModelStream, resources: pResources } = {},
    modelstream,
} ) =>

    stream( (emt, { sweep }) => {

        sweep.add(combine([scenesstream, modelstream]).at(
            ([ { advantages: sceneschema }, {advantages: modelschema} ]) => {
                const { args: { model, childrenmodel = "" } } = sceneschema;

                let curstate = null;
                let requirestatehook = null;
                let loadertimeout = null;
                let requirestatestream = null;

                const loaderstream = sceneschema.obtain("#loader");

                sweep.add( loaderstream.at( ({action}) => {

                    if(action === "complete") {

                        emt( { stream: loaderstream, key: "loader" } );

                        sweep.add( (!pModelStream || model ? modelschema.obtain(model) : pModelStream)
                            .at( ( data ) => {

                                let key;

                                //todo obsolete
                                if( data.hasOwnProperty("action") ) {
                                    key = data.action[1].argv;
                                }
                                else {
                                    [ key ] = data;
                                }

                            const view = sceneschema.pickToState( key );
                            if(!view) {
                                throw `tee state '${key}' not found for switcher`
                            }


                            if(curstate !== view.key) {

                                console.log(view.key);

                                curstate = view.key;

                                clearTimeout(loadertimeout);
                                loadertimeout = setTimeout(() =>
                                    emt( { stream: loaderstream, key: "loader" } ), 100);
                                sweep.add( () => clearTimeout(loadertimeout) );
                                requirestatehook && sweep.force( requirestatehook );

                                requirestatestream = sceneschema._obtain( {
                                    parent: { modelstream: pModelStream, resources: pResources },
                                    route: [ view.key ],
                                    modelschema: modelschema.get(model),
                                } );
                                sweep.add(requirestatehook = requirestatestream.at( ({action}) => {
                                    if(action === "complete") {
                                        clearTimeout(loadertimeout);
                                        emt( { stream: requirestatestream, key: view.key } );
                                    }
                                } ));
                            }

                        } ));

                    }

                } ) );

            })
        );

    } );


export default (scenesstream, { parent, modelstream, viewbuilder }) =>

    stream( (emt, { sweep, hook }) => {

        hook.add(({action}) => {
            emt({action: `${action}-complete`,});
        });

        sweep.add(scenesstream.at( ({ advantages: { schema, key, args: { frames = [], ...args }} }) => {

            const child = viewbuilder({ schema, key, ...args});

            let curstate = null;
            let curstatehook = stream((emt, { hook }) =>
                hook.add(({action: [action]}) => emt( { key: "pre",  action: `${action}-complete` } ))
            ).at( handle );
            sweep.add(curstatehook);
            let curstatenode = viewbuilder( { schema: ["curstatenode", { uqid: 0 }], key: "blank" } );
            child.replace(curstatenode);
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
                    child.replace( newstatenode );
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

            sweep.add(statesstream( scenesstream, { parent, modelstream } )
                .at( ({ stream, key }) => {
                if( curstate === stream ) {
                    if(stage === "fade-out") {
                        stage = "idle";
                        curstatehook( { action: ["fade-in"] } );
                        //there is no need to load a new state
                        sweep.force(requirestatehook);
                        requirestate = null;
                    }
                }
                else {
                    if(requirestate !== stream) {
                        if(requirestate) {
                            sweep.force(requirestatehook);
                            requirestate = null;
                        }
                        requirestate = stream;
                        sweep.add(requirestatehook = requirestate.at( ({...args}) => {
                            //fixme temporary solution controller problem
                            const id = setTimeout( () => handle({ ...args, key, stream }) );
                            sweep.add(() => clearTimeout(id));
                        } ));
                    }
                }
            } ));

        } ));

    });