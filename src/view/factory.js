import Advantages from "../advantages/advantages";

export default class Factory {

    create(options) {
        const {schema: [, {type}] } = options;
        if(!type) {
            return new Advantages( options );
        }
        else if(type === "switcher") {
            return new Advantages( options );
        }
        else {
            throw `unknown type '${type}'`
        }
    }

}