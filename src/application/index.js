import Render from "../render"
import Builder from "../builder"

export default class Application {

    constructor({path, autorun = true} = {}) {
        this.path = path;
        this.$ = {running: false};
        this.renders = [];
        this.builder = new Builder();
        autorun && this.run();
    }

    run() {
        if(this.$.running) {
            throw new EvalError("service is already running");
        }
        this.$.running = true;
    }

    render(source) {
        this.renders.push( new Render( source ) );
    }

}