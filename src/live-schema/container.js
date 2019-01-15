/*import LiveSchema from "./live-schema"

export default class Container extends LiveSchema {

    constructor(
        { schema: [ key, {sign = Container.sign, ...args}, ...advs ], ...options }
    ) {
        super( { schema: [ key, {sign, ...args}, ...advs ], ...options } );
    }

    static sign( sign ) {
        return ({key}) => Object.keys(sign).every( k => sign[k] === key[k] );
    }

}
*/

/*

advantages.obtain([{route: ["main", "session", "games", {name: "keno"}]}])[0].on( function (evt) {
    console.log(evt);
} );

 */