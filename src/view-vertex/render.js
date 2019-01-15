import {Container, Renderer, utils} from "pixi.js"

export default class Render {

    constructor( dom ) {
        utils.skipHello();
        this._renderer = new Renderer( {
            width: 720,
            height: 360,
            antialias: true,
            transparent: true
        } );
        dom.appendChild( this._renderer.view );
        this.owner = new Container();
        this.child = new Container();
        this.owner.addChild(this.child);
    }

    run( child ) {
        this.owner.removeChild( this.child );
        this.child = child;
        this.owner.addChild( child );
        cancelAnimationFrame( this._frame );
        this.frame();
    }

    frame() {
        this._frame = requestAnimationFrame( () => {
            this.frame();
            this._renderer.render( this.owner );
        } );
    }

    destroy() {
        cancelAnimationFrame( this._frame );
    }

}