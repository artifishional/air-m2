import { stream, combine } from "air-stream"

export default function ( sceneschema, model ) {
    return stream( emt => {
        let expectedstream = null;
        let expectedsubscriber = null;
        let actualsubscriber =
            stream( () => ({action}) => action && emt(`${action[0]}-complete`) )
                .at( expectedstateroamer );
        function expectedstatehandler( { action } ) {
            if(action === "complete") {
                expectedsubscriber();
                res.delete(expectedsubscriber);
                expectedsubscriber = null;
                actualsubscriber( { action: [ "fade-out" ] } );
            }
        }
        function expectedstateroamer( { action } ) {
            if(action === "fade-out-complete") {
                actualsubscriber();
                res.delete(actualsubscriber);
                actualsubscriber = expectedstream.at( expectedstateroamer );
                res.add(actualsubscriber);
                emt( expectedstream );
            }
        }

        function timetoloader() {
            
        }
        
        let loader = null;
        let timetoload = null;

        const res = new Set([
            sceneschema.at( ({ advantages }) => {

                loader = advantages.obtain("#loader");

                res.add(loader.at( ({action}) => {

                    if(action === "complete") {

                        model.at( ( { action, ..._state } ) => {

                            if(action === "change") {

                                timetoload = setTimeout( timetoloader );

                                expectedsubscriber && expectedsubscriber();
                                res.delete(expectedsubscriber);
                                //todo normilize this state
                                const state = _state.state || _state;
                                expectedstream = advantages.obtain( state );
                                expectedsubscriber = expectedstream.at( expectedstatehandler );
                                res.add(expectedsubscriber);

                            }

                        } );

                    }

                } ));

            })
        ]);
        return res;
    } );
}