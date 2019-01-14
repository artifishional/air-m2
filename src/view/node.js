import {combine, stream} from "air-stream"
import loader from "../loader/resources"
import { animate } from "air-gsap"
import { prop } from "../functional"

export default (scenesstream, {
    parent: { modelstream: pModelStream = null, resources: pResources = [] } = {},
    modelstream: ms,
    viewbuilder,
    ...argv
}) =>

    stream( (emt, { sweep, over }) => {

        sweep.add(combine([scenesstream, ms].filter(x=>x)).at(
            ([ { advantages: sceneschema }, {advantages: modelschema} = {} ]) => {

                const {
                    schema,
                    pack,
                    key,
                    args: { model, resources = [], keyframes = [], ...args },
                    item
                } = sceneschema;
                
                const modelstream = model || !pModelStream ? modelschema && combine([
                    modelschema.obtain(model),
                    modelschema.obtain("#intl"),
                ], (data, intl) => {
                    if(typeof data === "object" && !Array.isArray(data)) {
                        return { action: [ "*", { argv: data }], intl };
                    }
                    else if(Array.isArray(data)) {
                        return { action: [ data[1] && data[1][0] || "*", { argv: data[0]} ], intl };
                    }
                    else {
                        return { action: [ "*", { argv: data } ], intl } ;
                    }
                }) || null : pModelStream;

                sweep.add(
                    combine([ loader(pack, resources), modelstream && modelstream.ready() ].filter(Boolean)
                ).at(([resources]) => {

                    resources = resources.length ? [...resources, ...pResources] : pResources;

                    const view = viewbuilder( { schema, key, resources, ...args, ...argv }, modelstream );

                    const reactions = keyframes.filter(([name]) => !["fade-in", "fade-out"].includes(name));
                    if (reactions.length && modelschema) {
                        const hook = animate(view, ["keyframes", ...reactions], key).on(() => { });
                        sweep.add(hook);
                        sweep.add(modelstream.at(hook));
                    }

                    const effects = keyframes.filter(([name]) => ["fade-in", "fade-out"].includes(name));

                    const _animate = animate(view, ["keyframes", ...effects], key);

                    const elems = item
                        .filter( ({ args: { template } }) => !template )
                        .map(({key, args: { use } }) => {
                            if(use) {
                                return sceneschema.obtain(use, {
                                    parent: { resources, modelstream },
                                    modelschema: model ? modelschema.get(model) : ms,
                                })
                            }
                            else {
                                return sceneschema._obtain({
                                    parent: { resources, modelstream },
                                    route: [key],
                                    modelschema: model ? modelschema.get(model) : ms,
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