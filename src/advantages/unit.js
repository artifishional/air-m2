import Advantages from "./advantages";
import Loader from "../loader/loader";
import Factory from "../model/factory";
import {schemasNormalizer} from "../utils/index"

export default class Unit extends Advantages {

    constructor({
        parent = null,
        loader = Loader.default,
        factory = Factory.default,
        pack,
        schema: _schema,
    }) {
        const schema = schemasNormalizer(_schema);
        const [, {source}] = schema;
        super({
            pack,
            factory,
            parent,
            schema,
            loader
        });
    }

}