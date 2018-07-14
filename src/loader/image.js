import {Observable} from "air-stream"

export default class ObservableImage extends Observable {

    constructor( { url, ...args } ) {
        super( emt => {
            const image = new Image();
            image.src = url;
            image.crossorigin = true;
            image.onload = () => emt( {url, type: "img", image, ...args} );
        } );
    }

}