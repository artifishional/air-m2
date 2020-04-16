import { Howl } from "howler";

export default ( {path}, { url, revision, rel, urlOrigin, ...args } ) => new Promise(resolve => {
    const _path = path.split("/").filter(Boolean);
    const _rel = rel.split("/").filter(Boolean);
    while (_rel[0] === "..") {
        _rel.splice(0, 1);
        _path.splice(-1, 1);
    }
    url = new URL(`${urlOrigin}/m2units/${_path.join("/")}/res/sounds/${_rel.join("/")}`).href;
    const sound = new Howl({
        src: [`${url}.mp3${revision ? '?rev=' + revision : ''}`, `${url}.ogg${revision ? '?rev=' + revision : ''}`],
        onload: () => {
            resolve( {url, type: "sound", sound, ...args} );
        }
    });
})
