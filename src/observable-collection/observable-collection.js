export default class ObservableCollection extends Array {
	
	constructor(...args) {
		super(...args);
		this.observers = [];
	}
	
	static observe(src, prop, cb) {
		if(!(src[prop] instanceof ObservableCollection)) {
			const collection = src[prop];
			if(!collection) {
				debugger;
			}
			src[prop] = new ObservableCollection();
			src[prop].push(...collection);
		}
		return src[prop].observe(cb);
	}
	
	static unobserve(src, prop, cb) {
		return src[prop].unobserve(cb);
	}
	
	splice(start, deleteCount, ...item) {
		super.splice(start, deleteCount, ...item);
		this.observers.map( obs => obs(this, { added: [] }) );
	}
	
	push(...item) {
		super.push(...item);
		this.observers.map( obs => obs(this, { added: item }) );
	}
	
	observe(cb) {
		this.observers.push( cb );
	}
	
	unobserve(cb) {
		const indexOf = this.observers.indexOf( cb );
		if(indexOf === -1) {
			throw "unregistered observer";
		}
		this.observers.splice(indexOf, 1);
	}
	
}