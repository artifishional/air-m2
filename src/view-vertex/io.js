import { stream } from "air-stream"

export default class View extends Vertex {

    constructor(props) {
        super();
    }

    node( { model: { schema } } ) {
        return ViewStream( this, { model: { schema } } );
    }

    animate( node, { keyframes } ) {
        return AnimateStream( node, { keyframes } );
    }

}

function ViewStream( src, { model: { schema }} ) {

    return stream( ({ emt, req }) => {

        src.keyframes.length && req.on( src.animate( src ).at( emt ) );

    } );

}