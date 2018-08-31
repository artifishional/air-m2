import { Observable } from "air-stream"
import { Howl } from "howler"

export default class Sound extends Observable {

    constructor( { url, ...args } ) {
        super( emt => {
            const sound = new Howl({
                src: [`/${url}.mp3`, `/${url}.ogg`],
                onload: () => {
                    emt( {url, type: "sound", sound, ...args} );
                }
            });
        });
    }

}