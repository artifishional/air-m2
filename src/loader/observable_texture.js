import {Observable} from "air-stream"
import {Loader} from "pixi.js"

export default class ObservableTexture extends Observable {

    constructor( { url, ...args } ) {
        const loader = new Loader();
        super( emt => {
            loader.add({
                url,
                crossOrigin: true,
                onComplete: res => {
                    this.res = res;
                    emt( {url, type: "texture", texture: res.texture, ...args} );
                    this._aborted && this._abort();
                }
            }).load();
            return ( {dissolve} ) => dissolve && this._abort();
        } );
    }

    _abort() {
        this._aborted = true;
        this.res && this.res.texture.destroy(true);
    }

}