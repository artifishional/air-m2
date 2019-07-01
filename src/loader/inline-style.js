import { stream } from "air-stream";
import csstree from "css-tree";
import FontFaceObserver from "fontfaceobserver";

const FONT_LOADING_TIMEOUT = 30000;

function FileReader(blob) {
	return new Promise( (resolver) => {
		const reader = new globalThis.FileReader();
		reader.readAsDataURL(blob);
		reader.onloadend = resolver;
	} );
}

function createPrioritySystemStyle(priority) {
	while(PRIORITY.length < priority+1) {
		const style = document.createElement("style");
		PRIORITY.push(style);
		style.setAttribute("data-priority", `${PRIORITY.length-1}`);
		PRIORITY[PRIORITY.length-2].before(style);
	}
}

function inject(style, priority) {
	createPrioritySystemStyle(priority);
	PRIORITY[priority].after(style);
}

const PRIORITY = [];

export default ({ acid, priority, style, path, revision, ...args }) => {

	return stream(async (emt, {sweep}) => {

		if(!PRIORITY[0]) {
			const zero = document.createElement("style");
			zero.setAttribute("data-priority", "0");
			document.head.append(zero);
			PRIORITY[0] = zero;
		}

		style.textContent = style.textContent.replace(/:scope/g, `[data-scope-acid-${acid}]`);

		let isActive = true;

		const ast = csstree.parse(style.textContent);

		const dataForLoading = [];

		csstree.walk(ast, function(node) {
			if (this.atrule && this.atrule.name === 'font-face') {
				if (node.type === "Declaration" && node.property === 'font-family') {
					const values = node.value && node.value.children && node.value.children
						.toArray()
						.map(({value}) => value.replace(/"/g, ""));
					if (values) {
						dataForLoading.push({
							type: 'font',
							resource: values,
							target: null
						})
					}
				} else if (node.type === "Declaration" && node.property === 'src') {
					node.value && node.value.children && node.value.children
						.toArray()
						.filter(({type}) => type === 'Url')
						.map(({value}) => {
							let url = "m2units/" + path + value.value.replace(/"/g, "");
							if (revision) {
								if (url.indexOf('?') > -1) {
									url = `${url}&rev=${revision}`
								} else {
									url = `${url}?rev=${revision}`
								}
							}
							value.value = url;
						})
				}
			} else if ((this.rule || this.atrule && this.atrule.name === 'media') && node.type === 'Url') {
				const value = node.value.value;
				if (value.indexOf("data:") === -1) {
					dataForLoading.push({
						type: 'image',
						resource: value,
						target: node.value
					})
				}
			}
		});

		const promises = dataForLoading.map(({type, resource, target}) => {
			if (type === 'image') {
				let url = "m2units/" + path + resource.replace(/"/g, "");
				if (revision) {
					if (url.indexOf('?') > -1) {
						url = `${url}&rev=${revision}`
					} else {
						url = `${url}?rev=${revision}`
					}
				}
				return new Promise((resolve) => {
					fetch(url)
						.then(r => r.blob())
						.then(FileReader)
						.then(({target: {result: base64}}) => {
							target.value = base64;
							resolve();
						})
				});
			} else {
				return new FontFaceObserver(resource).load(null, FONT_LOADING_TIMEOUT);
			}
		});

		Promise.all(promises).then(() => {
			const result = csstree.generate(ast, { sourceMap: false });
			const commonStyle = document.createElement("style");
			commonStyle.append(result);

			if (isActive) {
				inject(commonStyle, priority);
				emt({type: "inline-style", style: commonStyle, ...args});
			}
		});

		sweep.add(() => {
			isActive = false;
		});
	});
}
