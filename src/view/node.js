import {combine, stream} from "air-stream"
import {Container, Text, Sprite} from "pixi.js"
import loader from "../loader/resources"
import {Animate} from "air-gsap"

export default (scenesstream, { modelstream }) =>

    stream( (emt, { sweep, over }) => {

        sweep.add(combine([scenesstream, modelstream].filter(x=>x)).at(
            ([ { advantages: sceneschema }, {advantages: modelschema} = {} ]) => {

                const {
                    pack,
                    key,
                    args: { node = "PIXI.Container", model, resources = [], frames = [], ...args },
                    item
                } = sceneschema;

                sweep.add(loader(pack, resources).at(resources => {

                    let child;

                    if (node === "PIXI.Text") {
                        const style = resources.find(({type}) => type === "font");
                        child = new Text(args.text, style && style.font);
                    }
                    else if (node === "PIXI.Container") {
                        child = new Container();
                    }
                    else if (node === "PIXI.Sprite") {
                        child = new Sprite(resources.find(({type}) => type === "texture").texture);
                    }
                    child.name = key;
                    Object.keys(args).map(key => child[key] = args[key]);

                    const reactions = frames.filter(([name]) => !["fade-in", "fade-out"].includes(name));
                    if (reactions.length) {
                        const hook = new Animate(child, ["frames", ...reactions]).on(() => { });
                        sweep.add(hook);
                        sweep.add(modelschema.obtain(model).at(hook));
                    }

                    const effects = frames.filter(([name]) => ["fade-in", "fade-out"].includes(name));
                    over.add(new Animate(child, ["frames", ...effects]).at(emt));

                    let children;
                    if (item.length) {
                        children = combine(
                            item.map(({key}) => sceneschema._obtain(({
                                route: [key],
                                modelschema: modelschema.get(model)
                            })))
                        );
                        sweep.add(children.at(actions => {
                            if (actions.every(({action}) => action === "complete")) {
                                const nodes = actions.map(({node: child}) => child);
                                child.addChild(...nodes);
                            }
                        }));
                    }

                    const waitingFor = [
                        item.length && children, model && modelschema.obtain(model)
                    ].filter(_ => _);

                    sweep.add( combine([...waitingFor, stream(emt => emt({action: "complete"}))])
                        .first()
                        .at(() => emt({action: "complete", node: child}))
                    );


                }));

            }


        ));


    });