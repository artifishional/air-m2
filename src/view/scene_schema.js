import { stream } from "air-stream"
import scenenode from "./../view/node"
import sceneswitch from "./switch"
import Factory from "./factory"
import Unit from "../advantages/unit"

export default class SceneSchema extends Unit {

    constructor({
        maintainer = SceneSchema.maintainer,
        factory = new Factory(),
        ...args
    }) {
        super({maintainer, factory, ...args});
    }

    static maintainer(scenesstream, {modelschema: modelstream}) {
        return stream((emt, {over}) =>
            over.add(scenesstream.at(({advantages: { args: { type = "node" } } }) => {
                if (type === "node") {
                    over.add(scenenode( scenesstream, { modelstream } ).on( emt ));
                }
                else if (type === "switcher") {
                    over.add(sceneswitch( scenesstream, { modelstream } ).on( emt ));
                }
            }))
        );
    }

}