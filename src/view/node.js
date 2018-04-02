export default class Node {

    /**
     *
     * @param parent
     * @param conf
     * @param resources
     */
    constructor({type, ...args}, resources) {
        this.parent = parent;

        if(type === "PIXI.Text") {
            this.gr = new PIXI.Text(args.text);
        }

    }

    action() {

    }

    set(model) {
        if(this.model !== model) {
            if(this.model) this.unobserve(this.model);
            this.observe(model);
        }
    }

    observe(model) {
        this.model = model;
        this.subscriber = this.model.on((...args) => this.action(...args) );
    }

    unobserve(model) {
        this.subscriber && this.subscriber();
        this.model = null;
    }

}