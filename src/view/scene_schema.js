import Unit from "./../advantages/unit"
import {Observable} from "air-stream"
import {Container, Text} from "pixi.js"
import Factory from "./factory";
const reinit = { type: "reinit" };

export default class SceneSchema extends Unit {

    constructor({
        schema: [key, {source, ...props}, ...schema],
        maintainer = SceneSchema.maintainer,
        ...args
    }) {
        if (source.hasOwnProperty("path")) {
            if (source.path.indexOf(".json") < 0) {
                source.path += "/index.json";
            }
        }
        super({
            schema: [key, {source, ...props}, ...schema],
            maintainer,
            factory: new Factory(),
            ...args
        });
    }

    //todo need refactor need Polimorfing Structure
    static maintainer(sceneschema, {modelschema, owner}) {
        return new Observable(emt => {

            const subs = [
                sceneschema.get().on(({
                    advantages: { args: {
                        node: nodetype = "PIXI.Container",
                        type = "node",
                        model,
                        position,
                        animations = []
                    }, item }
                }) => {

                    let node;

                    if (type === "switcher") {
                        node = new Container();
                    }
                    else if (type === "node") {
                        if (nodetype === "PIXI.Text") {
                            node = new Text(args.text);
                        }
                        else if(nodetype === "PIXI.Container") {
                            node = new Container();
                        }
                        position && (node.position = position);
                    }

                    model && subs.push(modelschema.obtain({route: model}).on(action => {
                        //do something with view
                    }));

                    if (type === "node") {
                        subs.push(owner.on(({action: {name}}) => {
                            //animations.find( ([_name]) => _name === name ) && 1 ||
                            emt({action: {name: `${name}-complete}`}}, reinit);
                        }));

                        const children = Observable.combine(
                            item.map(({key}) => sceneschema._obtain(({
                                owner,
                                route: [key],
                                modelschema: model && modelschema._get({route: model}) || modelschema
                            })))
                        );

                        subs.push(children.on(nodes => nodes.map(({node: child}) => node.addChild(child))));
                        subs.push(Observable.combine(
                            [ children, model && modelschema.obtain({route: model}) ].filter( _ => _ )
                        ).on(() => emt({action: {name: "complete", node}}, reinit)));
                    }
                    else if (type === "switcher") {

                        let emtOwner;
                        let curViewSubscriber = null;

                        const owner = new Observable( emt => emtOwner = emt );

                        subs.push(owner);

                        subs.push(sceneschema.obtain({route: "./loader", owner}).on( ({action: { name, node: loader }} ) => {

                            if(name === "complete") {

                                emt({action: {name: "complete", node}}, reinit);
                                emtOwner( { action: { name: "fade-in" } }, reinit );

                                node.addChild( loader );

                                subs.push(modelschema.obtain({route: model || "./"}).on(({state}) => {
                                    emtOwner( { action: { name: "fade-out" } }, reinit );


                                    //todo need async timeout
                                    node.removeChild( node.children[0] );
                                    node.addChild( loader );

                                    curViewSubscriber = sceneschema
                                        ._obtain( {route: state, owner } )
                                        .on( ({action: { name, node: chl}} ) => {

                                            if(name === "complete") {
                                                emtOwner( { action: { name: "fade-out" } }, reinit );
                                            }

                                            if(name === "fade-out-complete") {
                                                subs.splice(subs.indexOf(curViewSubscriber), 1);
                                                curViewSubscriber();
                                                node.removeChild( node.children[0] );
                                                node.addChild( chl );
                                                emtOwner( { action: { name: "fade-in" } }, reinit );
                                            }

                                        });

                                    subs.push(curViewSubscriber);

                                }));
                            }

                        } ));

                    }

                })
            ];

            return (...args) => subs.map(sub => sub(...args));

        });
    }

}