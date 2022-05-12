import { NODE_TYPES } from './def.mjs';

const { document } = globalThis;

export default class PlaceHolderContainer {

    constructor( owner, { type } ) {
        this.owner = owner;
        // https://github.com/jsdom/jsdom/issues/2274
        // this.target = new DocumentFragment();
        this.target = document.createDocumentFragment();
        this.begin = this.createSystemBoundNode("˄", type);
        this.end = this.createSystemBoundNode("˅", type);
        this.target.append( this.begin, this.end );
        this._dirty = false;
        this._targets = [];
    }

    slots() {
        return [ ...this.target.querySelectorAll(`slot[acid]`) ]
            .map( slot => ({ acid: +slot.getAttribute("acid"), slot }) )
    }

    append(...nodes) {
        this._dirty = true;
        this.begin.after(...nodes);
    }
    
    toJSON() {
        return 'PlaceHolderContainer';
    }

    createSystemBoundNode( point, species ) {
	    /*<@debug>*/
	    const label = this.owner.prop.key !== undefined ?
		    typeof this.owner.prop.key === "object" ?
			    JSON.stringify(this.owner.prop.key) :
			    this.owner.prop.key :
		    "";
	    return document.createComment(
		    `${point} ${species} ${this.owner.acid} ${this.owner.prop.label} ${label} ${point}`.toUpperCase()
	    );
	    /*</@debug>*/
        return document.createComment("");
    }

    remove() {
        return this.restore();
    }

    restore() {
        let point = this.begin;
        const res = [ point ];
        while (point !== this.end) {
            point = point.nextSibling;
            res.push(point);
        }
        this.target.append(...res);
    }

    clear() {
        while (this.begin.nextSibling !== this.end) {
            this.begin.nextSibling.remove();
        }
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
            return this._targets.filter( ({ type }) => type === "data" );
        }
        else if(type === "actives") {
            return this._targets.filter( ({ type }) => type === "active" );
        }
        else if(type === "sounds") {
            return this._targets.filter( ({ type }) => type === "sound" );
        }
    }

    //todo optimize with tree walker
    defineTargets( resources ) {
        const { target, begin = target.firstChild, end = target.lastChild  } = this;

        const res = [];
        let cur = begin.nextSibling;
        while (cur !== end) {
            if(
                cur.nodeType === NODE_TYPES.ELEMENT_NODE &&
                cur.nodeName.toUpperCase() !== "SLOT" ||
                cur.nodeType === NODE_TYPES.TEXT_NODE && cur.nodeValue &&
                (this.owner.prop.literal || cur.textContent.match(/{.+}/g))
            ) {
                res.push(cur);
            }
            cur = cur.nextSibling;
        }
        return res.map( node => this.owner.createActiveNodeTarget( node, resources ) );
    }

}