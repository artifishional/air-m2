import Unit from "./../advantages/unit"
import {Observable} from "air-stream"
import Node from "./node"

export default class View extends Unit {

    constructor({maintainer = View.maintainer, ...args}) {
        super({maintainer, ...args});
    }

    static maintainer(src, {route: [ key, ...route ], modelschema, parent, ...args}) {
        return new Observable((emt) => {
            src
                .get( {route: [ key, ...route ], ...args} )
                .on( (conf, children, resources) => {
                    const res = new Node( parent, conf, resources );
                    modelschema.obtain().on( obs => {
                        res.set(obs)
                    } );
                    emt( res );
                } );
        });
    }

}