import Unit from "./../advantages/unit"
import {Observable} from "air-stream"
import {Container, Text, Sprite} from "pixi.js"
import loader from "../loader/resources"
import Factory from "./factory";
import {searchBySignature} from "../utils"
import {Animate} from "air-gsap"

const reinit = {type: "reinit"};

//todo need refactor!!! need polimorfing structure
export default class SceneSchema extends Unit {

    constructor({
        maintainer = SceneSchema.maintainer,
        factory = new Factory(),
        ...args
    }) {
        super({maintainer, factory, ...args});
    }

    static maintainer(sceneschema, {modelschema}) {
        return new Observable(emt => {

            const source = Observable.combine([sceneschema, modelschema].filter(_ => _));

            const subs = [
                source.at(([ {advantages: sceneschema}, {advantages: modelschema} = {} ]) => {

                    const {
                        pack, key, args: {
                            node: nodetype = "PIXI.Container",
                            type = "node",
                            model,
                            resources = [],
                            childrenmodel,
                            frames = [],
                            ...args
                        }, item
                    } = sceneschema;

                    if (type === "node") {

                        subs.push(loader(pack, resources).at(resources => {

                            let node;

                            if (nodetype === "PIXI.Text") {
                                const style = resources.find(({type}) => type === "font");
                                node = new Text(args.text, style && style.font);
                            }
                            else if (nodetype === "PIXI.Container") {
                                node = new Container();
                            }
                            else if (nodetype === "PIXI.Sprite") {
                                node = new Sprite(resources.find(({type}) => type === "texture").texture);
                            }
                            node.name = key;
                            Object.keys(args).map(key => node[key] = args[key]);

                            const reactions = frames.filter(([name]) => !["fade-in", "fade-out"].includes(name));
                            if (reactions.length) {
                                const hook = new Animate(node, ["frames", ...reactions]).on(() => {
                                });
                                subs.push(hook);
                                subs.push(modelschema.obtain(model).at(hook));
                            }

                            const effects = frames.filter(([name]) => ["fade-in", "fade-out"].includes(name));
                            subs.push(new Animate(node, ["frames", ...effects]).at(emt));

                            let children;
                            if (item.length) {
                                children = Observable.combine(
                                    item.map(({key}) => sceneschema._obtain(({
                                        route: [key],
                                        modelschema: modelschema.get(model)
                                    })))
                                );
                                subs.push(children.at(actions => {
                                    if (actions.every(({action}) => action === "complete")) {
                                        const nodes = actions.map(({node: child}) => child);
                                        node.addChild(...nodes);
                                    }
                                }));
                            }

                            const waitingFor = [
                                item.length && children, model && modelschema.obtain(model)
                            ].filter(_ => _);

                            subs.push(
                                Observable
                                    .combine([...waitingFor, new Observable(emt => emt({action: "complete"}))])
                                    .first()
                                    .at(() => emt({action: "complete", node}))
                            );


                        }));

                    }

                    else if (type === "switcher") {

                        const node = new Container();

                        //todo move it to air-stream/switcher()
                        const views = item.map(({key}) => ({
                            key,
                            obs: sceneschema._obtain({
                                route: [key],
                                modelschema: modelschema.get(model + childrenmodel),
                            })
                        }));

                        const _loader = views.find(({key}) => key === "loader");
                        _loader.sub = _loader.obs.on(handler);
                        subs.push(_loader.obs.on(({action}) => {
                            action === "complete" && emt({action, node});
                        }));

                        let lastState = null;
                        let curState = "loader";
                        let curentViewNode = null;

                        function handler({action: name, node: child}) {
                            if (name === "complete") {
                                curentViewNode = child;
                                lastState && views.find(({key}) => key === lastState).sub({action: ["fade-out"]});
                            }
                            if (!lastState && name === "complete" || name === "fade-out-complete") {
                                lastState && views.find(({key}) => key === lastState).sub();
                                node.removeChild(node.children[0]);
                                node.addChild(curentViewNode);
                                searchBySignature(curState, views).sub({action: ["fade-in"]});
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

                                if (name === "change" && curState !== state) {
                                    lastState = curState;
                                    curState = state;
                                    const view = searchBySignature(curState, views);
                                    /*<@>*/
                                    if (!view) throw `view at state: ${state} not found`;
                                    /*</@>*/
                                    view.sub = view.obs.on(handler);
                                }
                            }));

                    }

                })
            ];

            return (...args) => subs.map(sub => sub(...args));

        });
    }

}