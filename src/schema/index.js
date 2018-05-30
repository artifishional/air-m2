export default class Schema {

    constructor([ name, props, ...next ]) {
        this.name = name;
        if(Array.isArray(props)) {
            this.item = [ new Schema(props) ];
            this.props = {};
            this.item.push(...next.map( Schema.create ));
        }
        else {
            this.item = next.map( Schema.create );
            this.props = props;
        }
    }

    static create(schema) {
        return new Schema(schema);
    }

    static toJSON(node) {
        return node.toJSON();
    }

    find(_name) {
        return this.item.find(({name}) => name === name);
    }

    toJSON() {
        return [ this.name, this.props, ...this.item.map( Schema.toJSON ) ];
    }

    merge( [ name, props, ...item ], type = "one-by-one" ) {
        if(type === "one-by-one") {
            this.props = {...this.props, ...props};
            item.map( item => {
                const exist = this.item.find( ([name]) => item[0] === name );
                exist ? exist.merge(item) : this.item.push( new Schema(item) );
            } );
        }
        else {
            throw new TypeError(`unsupported type '${type}'`);
        }
        return this;
    }

}