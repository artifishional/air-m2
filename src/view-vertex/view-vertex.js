/*import { stream } from "air-stream"
import { LiveSchema } from "air-m2/src/live-schema"
import scenenode from "./node"
import sceneswitch from "./switch"

export default class ViewVertex extends LiveSchema {
	
	maintainer(scenesstream, { modelschema: modelstream, viewbuilder, ...argv }) {
        return stream((emt, {over}) =>
            over.add(scenesstream.at((view) => {
                const {advantages: { args: { type = "node" } } } = view;
                if (type === "custom") {
                    over.add(view.source( scenesstream, { modelstream, ...argv } ).on( emt ));
                }
                else if (type === "node") {
                    over.add(scenenode( scenesstream, { modelstream, viewbuilder: this.viewbuilder, ...argv } ).on( emt ));
                }
                else if (type === "switcher") {
                    over.add(sceneswitch( scenesstream, { modelstream, viewbuilder: this.viewbuilder, ...argv } ).on( emt ));
                }
                else {
                    throw "unsupported m2 node view type"
                }
            }))
        );
    }

}*/