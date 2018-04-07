import Unit from "./../advantages/unit"
import {Observable} from "air-stream"
import {Container, Text} from "pixi.js"
import Factory from "./factory";
const reinit = { type: "reinit" };

//todo need refactor!!! need Polimorfing Structure
export default class SceneSchema extends Unit {

    constructor({
        maintainer = SceneSchema.maintainer,
        factory = new Factory(),
        ...args
    }) {
        super({ maintainer, factory, ...args});
    }

    static maintainer(sceneschema, {modelschema, owner}) {
        let self;
        return self = new Observable(emt => {

            const subs = [
                Observable.combine([ sceneschema, modelschema ].filter(_=>_)).on(([
                    {advantages: sceneschema},
                    {advantages: modelschema} = {},
                ]) => {

                    const { args: {
                            node: nodetype = "PIXI.Container",
                            type = "node",
                            model,
                            childrenmodel,
                            position,
                            animations = [],
                            ...args
                        }, item } = sceneschema;

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


                            console.log(sceneschema, self);

                            emt({action: {name: `${name}-complete`}}, reinit);
                        }));

                        let children;
                        if(item.length) {
                            children = Observable.combine(
                                item.map(({key}) => sceneschema._obtain(({
                                    owner,
                                    route: [key],
                                    modelschema: modelschema.get({route: model || "./"})
                                })))
                            );
                            subs.push(children.first().on(nodes => nodes.map(({action: {name, node: child}}) =>
                                name === "complete" && node.addChild(child)
                            )));
                        }

                        const waitingFor = [
                            item.length && children, model && modelschema.obtain({route: model || "./"})
                        ].filter( _ => _ );

                        if(waitingFor.length) {
                            subs.push(
                                Observable
                                    .combine(waitingFor)
                                    .first()
                                    .on(() => emt({action: {name: "complete", node}}, reinit) )
                            );
                        }
                        else {
                            emt({action: {name: "complete", node}}, reinit);
                        }

                    }

                    else if (type === "switcher") {
                        //todo move it to air-stream/switcher()
                        const views = item.map( ({key}) => {
                            const res = { key };
                            const owner = new Observable( emt => res.emt = emt );
                            res.obs = sceneschema._obtain( {
                                route: [key],
                                owner,
                                modelschema: modelschema.get( { route: model + childrenmodel } )
                            } );
                            return res;
                        } );

                        const view = views.find(({key}) => key === "loader");
                        view.sub = view.obs.on( handler );
                        subs.push(view.obs.on( ({action: {name}}) => {
                            name === "complete" && emt( {action: {name, node}} );
                        } ));

                        let lastState = null;
                        let curState = "loader";
                        let curentViewNode = null;

                        function handler({action: {name, node: child}}) {
                            if(name === "complete") {
                                curentViewNode = child;
                                lastState && views.find(({key}) => key === lastState)
                                    .emt( { action: { name: "fade-out", reinit } } );
                            }
                            if(!lastState && name === "complete" || name === "fade-out-complete") {
                                lastState && views.find(({key}) => key === lastState).sub();
                                node.removeChild( node.children[0] );
                                node.addChild( curentViewNode );
                                views.find(({key}) => key === curState).emt( { action: { name: "fade-in", reinit } } );
                            }
                        }

                        subs.push(modelschema.obtain({route: model || "./"}).on(({action: {name, state}}) => {
                            if(name === "change" && curState !== state) {
                                lastState = curState;
                                curState = state;
                                const view = views.find(({key}) => key === curState);
                                view.sub = view.obs.on( handler );
                            }
                        }));

                    }

                })
            ];

            return (...args) => subs.map(sub => sub(...args));

        });
    }

}