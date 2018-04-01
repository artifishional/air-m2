import {Container} from "pixi.js"

export default class Render {

    constructor() {
        this._renderer = PIXI.autoDetectRenderer( {
            width: 720,
            height: 360,
            antialias: true,
            transparent: true
        } );
        this.owner = new Container();
    }

    run(view) {
        (function frame() {
            this._frame = requestAnimationFrame( frame );
            this._renderer.render( this.owner );
        })();
        this.parse(this.owner, view);
    }

    destroy() {
        cancelAnimationFrame( this._frame );
    }

}