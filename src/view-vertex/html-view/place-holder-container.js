import {NODE_TYPES} from "air-m2/src/view-vertex/html-view/def"

export default class PlaceHolderContainer {

    constructor( owner, { type } ) {
        this.owner = owner;
        this.target = new DocumentFragment();
        this.begin = this.createSystemBoundNode("˄", type);
        this.end = this.createSystemBoundNode("˅", type);
        this.target.append( this.begin, this.end );
        this._dirty = false;
        this._targets = [];
    }

    append(...nodes) {
        this._dirty = true;
        this.begin.after(...nodes);
    }

    createSystemBoundNode( point, species ) {
        const label = typeof this.owner.prop.key === "object" ?
            JSON.stringify(this.owner.prop.key) : this.owner.prop.key;
        return document.createComment(
            `${point} ${species} ${this.owner.acid} ${label} ${point}`.toUpperCase()
        );
    }

    targets( type = "*", resources ) {
        if(this._dirty) {
            this._dirty = false;
            this._targets = this.defineTargets( resources );
        }
        if(type === "*") {
            return this._targets;
        }
        else if(type === "datas") {
            return this._targets.filter( ({ type }) => "data" );
        }
        else if(type === "actives") {
            return this._targets.filter( ({ type }) => "active" );
        }
    }

    //todo optimize with tree walker
    defineTargets( resources ) {
        const { target, begin = target.firstChild, end = target.lastChild  } = this;
        const res = [];
        let cur = begin;
        while (cur !== end) {
            if(
                cur.nodeType === NODE_TYPES.ELEMENT_NODE &&
                cur.nodeName.toUpperCase() !== "SLOT" ||
                cur.nodeType === NODE_TYPES.TEXT_NODE &&
                cur.textContent.match(/{.+}/g)
            ) {
                res.push(cur);
            }
            cur = cur.nextSibling;
        }
        return res.map( node => this.owner.createActiveNodeTarget( node, resources ) );
    }

}