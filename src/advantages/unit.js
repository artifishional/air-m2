import Advantages from "./advantages";
import Loader from "../loader/loader";
import Factory from "./factory";
import {schemasNormalizer} from "../utils/index"

export default class Unit extends Advantages {

    constructor({
        parent = null,
        loader = Loader.default,
        factory = Factory.default,
        schema,
        maintainer
    }) {
        super({
            maintainer,
            factory,
            parent,
            schema: schemasNormalizer(schema),
            loader
        });
    }

}