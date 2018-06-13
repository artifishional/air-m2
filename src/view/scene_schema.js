import Unit from "./../advantages/unit"
import {Observable} from "air-stream"
import {Container, Text, Sprite} from "pixi.js"
import loader from "../loader/resources"
import Factory from "./factory";
import {searchBySignature} from "../utils"
import { Animate } from "air-gsap"
const reinit = { type: "reinit" };

//todo need refactor!!! need polimorfing structure
export default class SceneSchema extends Unit {

    constructor({
                    maintainer = SceneSchema.maintainer,
                    factory = new Factory(),
                    ...args
                }) {
        super({ maintainer, factory, ...args});
    }

    static maintainer(sceneschema, {modelschema, owner, key}) {
        return new Observable(emt => {

            const source = Observable.combine([ sceneschema, modelschema ].filter(_=>_));

            const subs = [
                source.at(([
                               {advantages: sceneschema}, {advantages: modelschema} = {},
                           ]) => {

                    const { pack, args: {
                        node: nodetype = "PIXI.Container",
                        type = "node",
                        model,
                        resources = [],
                        childrenmodel,
                        frames = [],
                        ...args
                    }, item } = sceneschema;

                    if (type === "node") {

                        subs.push( loader(pack, resources).at( resources => {

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
                            Object.keys(args).map( key => node[key] = args[key] );

                            const reactions = frames.filter( ([name]) => !["fade-in", "fade-out"].includes(name) );
                            if(reactions.length) {
                                const hook = new Animate( node, [ "frames", ...reactions] ).on();
                                subs.push(hook);
                                subs.push(modelschema.obtain(model).at( hook ));
                            }

                            const effects = frames.filter( ([name]) => ["fade-in", "fade-out"].includes(name) );
                            if(effects.length) {
                                const hook = new Animate( node, [ "frames", ...reactions] ).at( emt );
                                subs.push(hook);
                                subs.push(modelschema.obtain(model).at( hook ));
                            }

                            let children;
                            if(item.length) {
                                children = Observable.combine(
                                    item.map(({key}) => sceneschema._obtain(({
                                        owner,
                                        route: [key],
                                        modelschema: modelschema.get(model)
                                    })))
                                );
                                subs.push(children.at( actions => {
                                    if(actions.every( ({action} ) => action === "complete" )) {
                                        const nodes = actions.map(({node: child}) => child);
                                        node.addChild(...nodes );
                                    }
                                } ));
                            }

                            const waitingFor = [
                                item.length && children, model && modelschema.obtain(model)
                            ].filter( _ => _ );

                            if(waitingFor.length) {
                                subs.push(
                                    Observable
                                        .combine(waitingFor)
                                        .first()
                                        .on(() => emt({action: "complete", node}, reinit) )
                                );
                            }
                            else {
                                emt({action: "complete", node}, reinit);
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
                                modelschema: modelschema.get( model + childrenmodel  ),
                                key
                            } );
                            return res;
                        } );

                        const _loader = views.find(({key}) => key === "loader");
                        _loader.sub = _loader.obs.on( handler );
                        subs.push(_loader.obs.on( ({action}) => {
                            action === "complete" && emt( {action, node} );
                        } ));

                        let lastState = null;
                        let curState = "loader";
                        let curentViewNode = null;

                        function handler({action: name, node: child}) {
                            if(name === "complete") {
                                curentViewNode = child;
                                lastState && views.find(({key}) => key === lastState)
                                    .emt( { action: [ "fade-out" ], reinit } );
                            }
                            if(!lastState && name === "complete" || name === "fade-out-complete") {
                                lastState && views.find(({key}) => key === lastState).sub();
                                node.removeChild( node.children[0] );
                                node.addChild( curentViewNode );
                                searchBySignature( curState, views )
                                    .emt( { action: [ "fade-in" ] } );
                            }
                        }

                        subs.push(
                            //so that the model does not climb before the loader is ready
                            Observable.combine([
                                    modelschema.obtain(model),
                                    _loader.obs.filter(({action}) => action === "complete")
                                ], model => model,
                            ).at(({action: name = "change", ..._state}) => {

                                const state = _state.state || _state;

                                if(name === "change" && curState !== state) {
                                    lastState = curState;
                                    curState = state;
                                    const view = searchBySignature( curState, views );
                                    /*<@>*/ if(!view) throw `view at state: ${state} not found` /*</@>*/
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