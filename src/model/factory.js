import Advantages from "../advantages/advantages";
import Container from "../advantages/container"

export default class Factory {

    constructor({ Creator }) {
        this.Creator = Creator;
    }

    create(options) {
        const {schema: [, {type}] } = options;
        return new this.Creator( options );
    }

}