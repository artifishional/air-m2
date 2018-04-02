import Unit from "./../advantages/unit"
import {Observable} from "air-stream"
import Node from "./node"

export default class SceneSchema extends Unit {

    constructor({schema: [key, {source, ...props}, ...schema], maintainer = SceneSchema.maintainer, ...args}) {
        if(source.hasOwnProperty("path")) {
            if(source.path.indexOf(".json") < 0) {
                source.path += "/index.json";
            }
        }
        super({schema: [key, {source, ...props}, ...schema], maintainer, ...args});
    }

    static maintainer(src, {route, modelschema, parent, ...args}) {
        return new Observable((emt) => {
            src._get( {route} )
                .on( ({ advantages } ) => {
                    const { args: { model: route, ...conf }, item } = advantages;
                    const res = new Node( conf );
                    res.set(modelschema.obtain({route}));
                    parent && parent.addChild(res.gr);


                    //item.map( ({key}) => advantages._get( advantages, { route: `./${key}`, modelschema } ) );

                    emt( res );
                } );
        });
    }

}