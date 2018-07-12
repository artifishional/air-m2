import {combine, stream} from "air-stream"
import loader from "../loader/resources"
import { animate } from "air-gsap"
import { prop } from "../functional"

export default (scenesstream, { modelstream, viewbuilder }) =>

    stream( (emt, { sweep, over }) => {

        sweep.add(combine([scenesstream, modelstream].filter(x=>x)).at(
            ([ { advantages: sceneschema }, {advantages: modelschema} = {} ]) => {

                const {
                    pack,
                    key,
                    args: { model, resources = [], frames = [], ...args },
                    item
                } = sceneschema;

                sweep.add(
                    combine([ loader(pack, resources), model && modelschema.obtain(model).first() ].filter(Boolean)
                ).at(([resources]) => {

                    const view = viewbuilder( {key, resources, ...args} );

                    const reactions = frames.filter(([name]) => !["fade-in", "fade-out"].includes(name));
                    if (reactions.length) {
                        const hook = animate(view, ["frames", ...reactions], key).on(() => { });
                        sweep.add(hook);
                        sweep.add(modelschema.obtain(model).at(hook));
                    }

                    const effects = frames.filter(([name]) => ["fade-in", "fade-out"].includes(name));
                    const _animate = animate(view, ["frames", ...effects], key);

                    const elems = item.map(({key}) => sceneschema._obtain(({
                        route: [key],
                        modelschema: modelschema.get(model)
                    })));

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