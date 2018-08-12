import Advantages from "../advantages/advantages";

export default class Factory {

    constructor( { viewbuilder, Creator } ) {
        this.viewbuilder = viewbuilder;
        this.Creator = Creator;
    }

    create(options) {
        const { viewbuilder } = this;
        const {schema: [, {type}] } = options;
        return new this.Creator( { ...options, viewbuilder } );
    }

}