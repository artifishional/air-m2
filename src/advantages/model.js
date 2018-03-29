import Advantages, {schemasNormalizer} from "./advantages"
import Loader from "../loader/loader";
import {Factory} from "./index";

export default class Model extends Advantages {

    static create({
                      parent = null,
                      loader = Loader.default,
                      factory = Factory.default,
                      schema
                  }) {
        return factory.create( { factory, parent, schema: schemasNormalizer(schema), loader } );
    }

}