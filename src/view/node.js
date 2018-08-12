import {combine, stream} from "air-stream"
import loader from "../loader/resources"
import { animate } from "air-gsap"
import { prop } from "../functional"

export default (scenesstream, { modelstream, viewbuilder, ...argv }) =>

    stream( (emt, { sweep, over }) => {

        sweep.add(combine([scenesstream, modelstream].filter(x=>x)).at(
            ([ { advantages: sceneschema }, {advantages: modelschema} = {} ]) => {

                const {
                    pack,
                    key,
                    args: { model, resources = [], frames = [], ...args },
                    item
                } = sceneschema;

                const modelstream = model && modelschema.obtain(model) || null;

                sweep.add(
                    combine([ loader(pack, resources), model && modelstream.first() ].filter(Boolean)
                ).at(([resources]) => {

                    const view = viewbuilder(
                        { key, resources, ...args, ...argv },
                        modelstream
                    );

                    const reactions = frames.filter(([name]) => !["fade-in", "fade-out"].includes(name));
                    if (reactions.length) {
                        const hook = animate(view, ["frames", ...reactions], key).on(() => { });
                        sweep.add(hook);
                        sweep.add(modelstream.at(hook));
                    }

                    const effects = frames.filter(([name]) => ["fade-in", "fade-out"].includes(name));
                    const _animate = animate(view, ["frames", ...effects], key);

                    const elems = item
                        .filter( ({ args: { template } }) => !template )
                        .map(({key, args: { use, pid } }) => {
                            if(use) {
                                return sceneschema.obtain(use, {
                                    modelschema: modelschema.get(model),
                                    pid
                                })
                            }
                            else {
                                return sceneschema._obtain({
                                    route: [key],
                                    modelschema: modelschema.get(model),
                                    pid
                                })
                            }
                        });

                    const all = [...elems, _animate];
                    all.map( obs => over.add(obs.at( ()=> {} )) );

                    if(elems.length) sweep.add(combine( elems.map( obs => obs.filter(prop("action").eq("complete")) ) ).at(
                        views => {
                            view.add(...views.map( ({node}) => node ));
                            emt( {action: "complete", node: view} );
                        }
                    ));
                    else {
                        emt( { action: "complete", node: view } );
                    }
                    sweep.add(() => view.clear());
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