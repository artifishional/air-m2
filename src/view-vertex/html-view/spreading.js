import {EMPTY_FUNCTION, EMPTY_OBJECT} from "../../def";

export const STD_PROXY_CONFIG = {
	has() {
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
		throw 1;
	}
};

export default function spreading(
	statement,
	defaultValue = EMPTY_OBJECT,
	defaultProc = EMPTY_FUNCTION,
	map = null,
) {
	if(statement) {
		const fn = new Function("argv", `with(argv) return ${statement}`);
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