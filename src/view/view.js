export default class View {

    constructor() {
        this._obs = null;
        this._dispose = null;
    }

    set(observable) {

        if(this._obs) {
            this.unobserve(this._obs);
        }

        this.observe(observable);

        this._obs = observable;

    }

    unobserve(observable) {
        this._dispose();
        this._obs = null;
    }

    observe(observable) {
        this._obs = observable;
        this._dispose = observable.on( () => this._doaction );
    }

    _doaction() {

    }

    append( node ) { }

    remove( node ) {}

}