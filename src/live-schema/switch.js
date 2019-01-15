/*import {Observable} from "air-stream"
import {routeNormalizer} from "../utils/index";

/**
 *
 * @param {LiveSchema} advantages
 * @param {String} item Node with switchable states
 * @param {String|Object} target Data source
 * @returns {*}
 *//*
export default function ({advantages, routes: { item, target } }) {

    return advantages
        .obtain(target)
        .withHandler( (emt, evt) =>
            emt.emit(advantages.obtain( { route: [...routeNormalizer(item), evt] } ) )
        )
        //.unique();

}*/