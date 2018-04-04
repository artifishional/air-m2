import Unit from "./../advantages/unit"
import {Observable} from "air-stream"
import {Text} from "pixi.js"

export default class SceneSchema extends Unit {

    constructor({schema: [key, {source, ...props}, ...schema], maintainer = SceneSchema.maintainer, ...args}) {
        if(source.hasOwnProperty("path")) {
            if(source.path.indexOf(".json") < 0) {
                source.path += "/index.json";
            }
        }
        super({schema: [key, {source, ...props}, ...schema], maintainer, ...args});
    }

    //todo need refactor
    static maintainer(sceneschema, { modelschema }) {
        return new Observable( emt => {

            const subs = [
                sceneschema.get().on( ( {advantages: {args: { vtype, model, position, ...args }, item } } ) => {

                    let node;

                    if(vtype === "PIXI.Text") {
                        node = new Text( args.text );
                        position && (node.position = position);
                    }

                    model && subs.push(modelschema.obtain({ route: model }).on( action => {
                        //do something with view
                    } ));

                    subs.push(Observable.combine(
                        item.map( ({key}) => sceneschema._obtain( ({
                            route: [key],
                            modelschema: model && modelschema._get({ route: model }) || modelschema
                        } ) ) )
                    ).on( nodes => nodes.map(({node:child}) => node.addChild( child ) )) );

                    subs.push( Observable.combine( [
                        ...model ? [modelschema.obtain({ route: model })] : [],
                        ...item.map( ({key}) => sceneschema._obtain( ({
                            route: [key],
                            modelschema: model && modelschema._get({ route: model }) || modelschema
                        } ) ) )
                    ] ).on( () => emt( { node } )));

                } )
            ];

            return (...args ) => subs.map(sub => sub(...args));

        });
    }

}