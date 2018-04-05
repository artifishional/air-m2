import Advantages from "../advantages/advantages";
import Container from "../advantages/container"

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

}