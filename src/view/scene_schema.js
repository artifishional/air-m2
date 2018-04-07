import Unit from "./../advantages/unit"
import {Observable} from "air-stream"
import {Container, Text, Sprite} from "pixi.js"
import loader from "../loader/resources"
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
        return new Observable(emt => {

            const subs = [
                Observable.combine([ sceneschema, modelschema ].filter(_=>_)).on(([
                    {advantages: sceneschema},
                    {advantages: modelschema} = {},
                ]) => {

                    const { pack, args: {
                            node: nodetype = "PIXI.Container",
                            type = "node",
                            model,
                            resources = [],
                            childrenmodel,
                            animations = [],
                            ...args
                        }, item } = sceneschema;

                    if (type === "node") {

                        subs.push( loader(pack, resources).on( resources => {

                            let node;

                            if (nodetype === "PIXI.Text") {
                                const style = resources.find( ({type}) => type === "font" );
                                node = new Text(args.text, style && style.font);
                            }
                            else if(nodetype === "PIXI.Container") {
                                node = new Container();
                            }
                            else if (nodetype === "PIXI.Sprite") {
                                node = new Sprite(resources.find( ({type}) => type === "texture" ).texture);
                            }
                            for(let key in args) {
                                node[key] = args[key];
                            }

                            model && subs.push(modelschema.obtain({route: model}).on(action => {
                                //do something with view
                            }));

                            subs.push(owner.on(({action: {name}}) => {
                                //animations.find( ([_name]) => _name === name ) && 1 ||

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
                                subs.push(children.on( actions => {
                                    if(actions.every( ({action: {name}} ) => name === "complete" )) {
                                        const nodes = actions.map(({action: {node: child}}) => child);
                                        node.addChild(...nodes );
                                    }
                                } ));
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


                        } ) );

                    }

                    else if (type === "switcher") {

                        const node = new Container();

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