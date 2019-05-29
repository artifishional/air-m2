import { Observable } from "air-stream"
import { Howl } from "howler"

export default class Sound extends Observable {

    constructor( { url, revision, ...args } ) {
        super( emt => {
            const sound = new Howl({
                src: [`${url}.mp3${revision ? '?revision=' + revision : ''}`, `${url}.ogg${revision ? '?revision=' + revision : ''}`],
                onload: () => {
                    emt( {url, type: "sound", sound, ...args} );
                }
            });
        });
    }

}