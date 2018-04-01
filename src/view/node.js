export default class Node {

    /**
     *
     * @param parent
     * @param conf
     * @param resources
     */
    constructor(parent, conf, resources) {
        this.parent = parent;

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