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

    parse(parent, scene) {
        scene
            .obtain( )
            .on( ({type, texture}, children, resources) => {
                let node;
                if(type === "sprite") {
                    node = new PIXI.Sprite(resources[ texture ]);
                    parent.addChild(node);
                }
                children.map( ({route}) => this.parse( node, scene.get( {route} ) ) );
            });
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

class View {

    constructor(parent, scene) {

    }

    doaction() {

    }

    set(model) {
        this.unobserve = this.model.on((...args) => this.doaction(...args) );
    }

}