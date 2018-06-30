import { stream, combine } from "air-stream"
import { prop } from "../functional"

function statesstream( sceneschema, {modelschema} ) {

    return stream( (emt, { sweep }) => {

        sweep.add(combine([sceneschema, modelschema]).at(
            ([ { advantages: sceneschema }, {advantages: modelschema} ]) => {
                const { args: { model, childrenmodel } } = sceneschema;

                let curstate = null;
                let requirestatehook = null;
                let loadertimeout = null;
                let requirestatestream = null;

                const loaderstream = sceneschema.obtain("#loader");

                sweep.add( loaderstream.at( ({action}) => {

                    if(action === "complete") {

                        emt( { stream: loaderstream } );

                        sweep.add(modelschema.at( ([ action, key ]) => {
                            if(action === "change") {

                                if(curstate !== key) {

                                    clearTimeout(loadertimeout);
                                    loadertimeout = setTimeout(() => emt( { stream: loaderstream } ) , 100);

                                    requirestatehook && sweep.force( requirestatehook );
                                    requirestatestream = sceneschema._obtain( {
                                        route: [ key ],
                                        modelschema: modelschema.get(model + childrenmodel),
                                    } );
                                    sweep.add(requirestatehook = requirestatestream.at( ({action}) => {

                                        if(action === "complete") {
                                            clearTimeout(loadertimeout);
                                            curstate = key;
                                            emt( { stream: requirestatestream } );
                                        }

                                    } ));

                                }

                            }
                        } ));

                    }

                } ) );

            })
        );

    } );

}


export default function (input, parent) {

    return stream( (emt, { sweep }) => {

        sweep.add(combine([sceneschema, modelschema]).at(
            ([ { advantages: sceneschema }, {advantages: modelschema} ]) => {

                let curstate = null;
                let curstatehook = stream((emt) => ([action]) => emt( { action: `${action}-complete` } )).at( handle );
                sweep.add(curstatehook);
                let curstatenode = new PIXI.Container();
                curstatenode.name = "blank";
                parent.addChild(curstatenode);
                let stage = "idle";
                let requirestate = null;
                let requirestatehook = null;

                sweep.add(statesstream( sceneschema, {modelschema} ).at( ({ stream }) => {
                    if( curstate === stream ) {
                        if(stage === "fade-out") {
                            stage = "idle";
                            curstatehook( ["fade-in"] );
                            //there is no need to load a new state
                            sweep.force(requirestatehook);
                            requirestatehook = null;
                        }
                    }
                    else {
                        if(requirestate !== stream) {
                            if(requirestatehook) {
                                sweep.force(requirestatehook);
                                requirestate = null;
                            }
                            requirestate = stream;
                            sweep.add(requirestatehook = requirestate.at( handle ));
                        }
                    }
                } ));

                function handle( { action, node } ) {
                    if(action === "fade-out-complete") {
                        sweep.force(curstatehook);
                        sweep.add(curstatehook = requirestatehook);
                        stage = "idle";
                        parent.removeChild(curstatenode);
                        parent.addChild( node );
                        curstate = requirestate;
                        curstatehook( [ "fade-in" ] );
                    }
                    else if(action === "complete") {
                        curstatenode = node;
                        curstatehook( [ "fade-out" ] );
                    }
                }

            }));

    });

}
/*


tasks
toggle the states
control the animation of the input / output

*/