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
        super({maintainer: (scenesstream, { modelschema }) =>
            maintainer( scenesstream, { modelschema, viewbuilder } ), factory, ...args}
        );
    }

    static maintainer(scenesstream, { modelschema: modelstream, viewbuilder }) {
        return stream((emt, {over}) =>
            over.add(scenesstream.at(({advantages: { args: { type = "node" } } }) => {
                if (type === "node") {
                    over.add(scenenode( scenesstream, { modelstream, viewbuilder } ).on( emt ));
                }
                else if (type === "switcher") {
                    over.add(sceneswitch( scenesstream, { modelstream, viewbuilder } ).on( emt ));
                }
            }))
        );
    }

}