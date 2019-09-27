import { Howl } from "howler";

export default ( { url, revision, ...args } ) => new Promise(resolve => {
    const sound = new Howl({
        src: [`${url}.mp3${revision ? '?rev=' + revision : ''}`, `${url}.ogg${revision ? '?rev=' + revision : ''}`],
        onload: () => {
            resolve( {url, type: "sound", sound, ...args} );
        }
    });
})
