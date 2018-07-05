import { stream, combine } from "air-stream"
import {Container} from "pixi.js"

const statesstream = ( scenesstream, { modelstream } ) =>

    stream( (emt, { sweep }) => {

        sweep.add(combine([scenesstream, modelstream]).at(
            ([ { advantages: sceneschema }, {advantages: modelschema} ]) => {
                const { args: { model, childrenmodel } } = sceneschema;

                let curstate = null;
                let requirestatehook = null;
                let loadertimeout = null;
                let requirestatestream = null;

                const loaderstream = sceneschema.obtain("#loader");

                sweep.add( loaderstream.at( ({action}) => {

                    if(action === "complete") {

                        emt( { stream: loaderstream, key: "loader" } );

                        sweep.add(modelschema.obtain(model).at( ( { action, key } ) => {

                            if(action === "change" && curstate !== key) {

                                clearTimeout(loadertimeout);
                                loadertimeout = setTimeout(() => emt( { stream: loaderstream, key: "loader" } ) , 100);

                                requirestatehook && sweep.force( requirestatehook );
                                requirestatestream = sceneschema._obtain( {
                                    route: [ key ],
                                    modelschema: modelschema.get(model + childrenmodel),
                                } );
                                sweep.add(requirestatehook = requirestatestream.at( ({action}) => {

                                    if(action === "complete") {
                                        clearTimeout(loadertimeout);
                                        curstate = key;
                                        emt( { stream: requirestatestream, key } );
                                    }

                                } ));

                            }

                        } ));

                    }

                } ) );

            })
        );

    } );


export default (scenesstream, { modelstream }) =>

    stream( (emt, { sweep }) => {

        const child = new Container();

        let curstate = null;
        let curstatehook = stream((emt, { hook }) =>
            hook.add(({action: [action]}) => emt( { action: `${action}-complete` } ))
        ).at( handle );
        sweep.add(curstatehook);
        let curstatenode = new PIXI.Container();
        curstatenode.name = "blank";
        child.addChild(curstatenode);
        let stage = "idle";
        let requirestate = null;
        let requirestatehook = null;
        let newstatenode = null;

        let loaded = false;

        sweep.add(statesstream( scenesstream, { modelstream } ).at( ({ stream, key }) => {

            if( curstate === stream ) {
                debugger;
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
                    sweep.add(requirestatehook = requirestate.at( ({...args}) => handle({...args, key}) ));
                }
            }
        } ));

        function handle( { action, node, key } ) {

            if(action === "fade-out-complete") {
                console.log("fade-out-complete", key);
                sweep.force(curstatehook);
                sweep.add(curstatehook = requirestatehook);
                stage = "idle";
                child.removeChild( curstatenode );
                child.addChild( newstatenode );
                curstatenode = newstatenode;
                curstate = requirestate;
                requirestate = null;
                curstatehook( { action: [ "fade-in" ]} );
            }
            else if(action === "complete") {
                newstatenode = node;
                stage = "fade-out";
                debugger;
                curstatehook( {action: [ "fade-out" ]} );
                if(!loaded) {
                    emt( {action: "complete", node: child} );
                    loaded = true;
                }
            }
        }

    });