import {Observable} from "air-stream"
import {loader} from "pixi.js"

export default class ObservableTexture extends Observable {

    constructor( { url, ...args } ) {
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
            return () => this._abort();
        } );
    }

    _abort() {
        this._aborted = true;
        this.res && this.res.texture.destroy(true);
    }

}