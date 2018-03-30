import Unit from "./../advantages/unit"

export default class View extends Unit {

    constructor({maintainer = View.maintainer, ...args}) {
        super({maintainer, ...args});
    }

    static maintainer(src, {route: [ key, ...route ], ...args}) {
        return src.get( {route: [ key, ...route ], ...args} );
    }

    set(advantages) {



    }

}