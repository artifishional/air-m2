import { stream } from "air-stream"
import scenenode from "./../view/node"
import sceneswitch from "./switch"
import Factory from "./factory"
import Unit from "../advantages/unit"

export default class SceneSchema extends Unit {

    constructor({
        viewbuilder,
        maintainer = SceneSchema.maintainer,
        factory = new Factory( { viewbuilder } ),
        ...args
    }) {
        super({
            maintainer: (scenesstream, { modelschema, ...argv }) =>
                maintainer( scenesstream, { modelschema, viewbuilder, ...argv } ),
            factory,
            ...args
        });
    }

    static maintainer(scenesstream, { modelschema: modelstream, viewbuilder, ...argv }) {
        return stream((emt, {over}) =>
            over.add(scenesstream.at(({advantages: { args: { type = "node" } } }) => {
                if (type === "node") {
                    over.add(scenenode( scenesstream, { modelstream, viewbuilder, ...argv } ).on( emt ));
                }
                else if (type === "switcher") {
                    over.add(sceneswitch( scenesstream, { modelstream, viewbuilder, ...argv } ).on( emt ));
                }
            }))
        );
    }

}