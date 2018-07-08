import Advantages from "../advantages/advantages";

export default class Factory {

    constructor( viewbuilder ) {
        this.viewbuilder = viewbuilder;
    }

    create(options) {
        const { viewbuilder } = this;
        const {schema: [, {type}] } = options;
        if(!type) {
            return new Advantages( { ...options, viewbuilder } );
        }
        else if(type === "switcher") {
            return new Advantages( { ...options, viewbuilder } );
        }
        else {
            throw `unknown type '${type}'`
        }
    }

}