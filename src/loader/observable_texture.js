import {Observable} from "air-stream"
import {loader} from "pixi.js"

export default class ObservableTexture extends Observable {

    constructor( texture ) {
        super( emt => {
            this.textureid = ObservableTexture.index ++ ;
            loader.add(`${this.textureid}`, texture);
            loader.load((loader, resources) => {
                emt( resources[this.textureid].texture );
            });
            return () => {
                //todo need async cleaner after the resource is complete loading
            }
        } );
    }

    static index = 0;

}