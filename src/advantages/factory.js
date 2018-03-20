import Advantages from "./index";
import Container from "./container"

export default class Factory {

    create(options) {
        const {schema: [, {type}] } = options;
        if(!type) {
            return new Advantages( options );
        }
        else if(type === "container") {
            return new Container( options );
        }
    }

    static default = new Factory()

}