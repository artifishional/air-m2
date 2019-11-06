import {EMPTY_FUNCTION, EMPTY_OBJECT} from "../../def";

const STD_PROXY_CONFIG = {
	has(target, prop) {
		return true;
	},
	get(target, prop) {
		if(prop === Symbol.unscopables) {
			return false;
		}
		const vl = target[prop];
		if (vl !== undefined) {
			return vl;
		}
		throw "Undefined property";
	}
};

export default function spreading(
	statement,
	defaultValue = EMPTY_OBJECT,
	defaultProc = EMPTY_FUNCTION,
	map = null,
	...additionalArguments
) {
	if(statement) {
		const fn = new Function("argv", ...additionalArguments, `with(argv) return ${statement}`);
		return data => {
			try {
				const res = fn(new Proxy(data, STD_PROXY_CONFIG));
				return map ? map(res) : res;
			}
			catch (e) {
				return defaultValue;
			}
		}
	}
	return defaultProc;
}