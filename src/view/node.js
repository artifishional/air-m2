import {combine, stream} from "air-stream"
import {Container, Text, Sprite} from "pixi.js"
import loader from "../loader/resources"
import {Animate} from "air-gsap"
import { prop } from "../functional"

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

                sweep.add(
                    combine([ loader(pack, resources), model && modelschema.obtain(model).first() ].filter(Boolean)
                ).at(([resources]) => {

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
                    const animate = new Animate(child, ["frames", ...effects]);

                    const elems = item.map(({key}) => sceneschema._obtain(({
                        route: [key],
                        modelschema: modelschema.get(model)
                    })));

                    const all = [...elems, animate];
                    all.map( obs => over.add(obs.at( ()=> {} )) );

                    if(elems.length) sweep.add(combine( elems.map( obs => obs.filter(prop("action").eq("complete")) ) ).at(
                        childs => {
                            childs.map( ({node}) => child.addChild(node) );
                            emt( {action: "complete", node: child} );
                        }
                    ));
                    else {
                        emt( {action: "complete", node: child} );
                    }

                    sweep.add(combine(all.map( obs => obs.filter(prop("action").eq("fade-in-complete")) )).at(
                        () => emt( {action: "fade-in-complete"} )
                    ));
                    sweep.add(combine(all.map( obs => obs.filter(prop("action").eq("fade-out-complete")) )).at(
                        () => emt( {action: "fade-out-complete"} )
                    ));

                }));

            }


        ));


    });