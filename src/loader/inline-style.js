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

		const images = [];
		const fonts = [];

		csstree.walk(ast, async function(node) {
			if (node.type === 'Url') {
				const value = node.value.value;
				if (value.indexOf("data:image") === -1) {
					images.push(value);
				}
			} else if (this.atrule && this.atrule.name === 'font-face') {
				if (node.type === "Declaration" && node.property === 'font-family') {
					const values = node.value && node.value.children && node.value.children
						.toArray()
						.map(({value}) => value.replace(/"/g, ""));
					if (values) {
						fonts.push(...values);
					}
				}
			}
		});

		const imgPromises = images.map(async (value) => {
			let url = "m2units/" + path + value.replace(/"/g, "");
			if (revision) {
				if (url.indexOf('?') > -1) {
					url = `${url}&rev=${revision}`
				} else {
					url = `${url}?rev=${revision}`
				}
			}
			const promise = new Promise((resolve, reject) => {
				fetch(url)
					.then(r => r.blob())
					.then(FileReader)
					.then(({target: {result: base64}}) => {
						resolve({
							[value]: base64
						})
					})
			});
			return promise;
		});

		const fontsPromises = fonts.map((font) => {
			return new FontFaceObserver(font).load(null, FONT_LOADING_TIMEOUT);
		})

		Promise.all([
			...imgPromises,
			...fontsPromises
		]).then((data) => {
			const images = data.reduce((acc, elem) => {
				return {
					...acc,
					...elem
				}
			}, {});
			csstree.walk(ast, async function(node) {
				if (node.type === 'Url') {
					const value = node.value.value;
					node.value.value = images[value];
					if (value.indexOf("data:image") === -1) {
						node.value.value = images[value];
					}
				} else if (this.atrule && this.atrule.name === 'font-face') {
					if (node.type === "Declaration" && node.property === 'src') {
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
				}
			});

			const result = csstree.generate(ast, { sourceMap: false });
			const commonStyle = document.createElement("style");
			commonStyle.append(result);

			if (isActive) {
				inject(commonStyle, priority);
				emt({type: "inline-style", style: commonStyle, ...args});
			}
		})

		sweep.add(() => {
			isActive = false;
			// commonStyle.remove();
			// fontFaceStyle && fontFaceStyle.remove();
		});
	});
}
