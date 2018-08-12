import { stream } from "air-stream"
import scenenode from "./../view/node"
import sceneswitch from "./switch"
import Factory from "./factory"
import Unit from "../advantages/unit"

export default class Creator extends Unit {

    constructor({
        viewbuilder,
        factory = new Factory( { viewbuilder, Creator } ),
        ...args
    }) {
        super({ factory, ...args });
        this.viewbuilder = viewbuilder;
    }

    maintainer(scenesstream, { modelschema: modelstream, viewbuilder, ...argv }) {
        return stream((emt, {over}) =>
            over.add(scenesstream.at(({advantages: { args: { type = "node" } } }) => {
                if (type === "node") {
                    over.add(scenenode( scenesstream, { modelstream, viewbuilder: this.viewbuilder, ...argv } ).on( emt ));
                }
                else if (type === "switcher") {
                    over.add(sceneswitch( scenesstream, { modelstream, viewbuilder: this.viewbuilder, ...argv } ).on( emt ));
                }
            }))
        );
    }

}