const originPush = Array.prototype.push;

Array.prototype.push = function (...data) {
	const res = originPush.call(this, ...data);
	if(!this.$$$ctx) {
		this.$$$ctx = 1;
	}
	if(this.length > this.$$$ctx * 10000) {
		this.$$$ctx *= 10;
		debugger;
	}
	return res;
};