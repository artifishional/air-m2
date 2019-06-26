import { stream } from "air-stream";
import csstree from "css-tree";
import FontFaceObserver from "fontfaceobserver";
import ImagePreloader from "image-preloader";

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
		let fontFaceStyle = null;

		// const targets = [];
		// let rawFontCSSContent = "";
		// let rawCommonCSSContent = "";

		const ast = csstree.parse(style.textContent);

		const images = [];
		const fonts = [];

		csstree.walk(ast, async function(node, item, list) {
			if (node.type === 'Url') {
				const value = node.value.value;
				if (value.indexOf("data:image") === -1) {
					let url = "m2units/" + path + value.replace(/"/g, "");
					if (revision) {
						if (url.indexOf('?') > -1) {
							url = `${url}&rev=${revision}`
						} else {
							url = `${url}?rev=${revision}`
						}
					}
					images.push(url);
				}
			} else if (this.declaration && this.declaration.property === 'font-family') {
				const font = node.value && node.value.replace(/"/g, "").replace(/,/g, "");
				if (font) {
					fonts.push(font);
				}
			}
		});

		const fontsSet = new Set(fonts);
		console.warn([...fontsSet]);

		const result = images.map(async (url) => {
			const promise = new Promise((resolve, reject) => {
				fetch(url)
					.then(r => r.blob())
					.then(FileReader)
					.then(({target: {result: base64}}) => {
						resolve({
							[url]: base64
						})
					})
			});
			return promise;
		});

		Promise.all(result).then((data) => {
			const images = data.reduce((acc, elem) => {
				return {
					...acc,
					...elem
				}
			}, {});
			csstree.walk(ast, async function(node, item, list) {
				if (node.type === 'Url') {
					const value = node.value.value;
					node.value.value = images[value];
					if (value.indexOf("data:image") === -1) {
						let url = "m2units/" + path + value.replace(/"/g, "");
						if (revision) {
							if (url.indexOf('?') > -1) {
								url = `${url}&rev=${revision}`
							} else {
								url = `${url}?rev=${revision}`
							}
						}
						node.value.value = images[url];
					}
				}
			});

			const result = csstree.generate(ast, { sourceMap: false });
			const commonStyle = document.createElement("style");
			commonStyle.append(result);

			// Promise.all(
			// 	targets.map(({raw, type}) => {
			// 		if (type === "font") {
			// 			return new FontFaceObserver(raw).load(null, FONT_LOADING_TIMEOUT);
			// 		} else if (type === "img") {
			// 			return new ImagePreloader().preload(raw);
			// 		}
			// 	})
			// ).then(() => {
			if (isActive) {
				inject(commonStyle, priority);
				emt({type: "inline-style", style: commonStyle, ...args});
			}
			// });
		})

		// console.warn([...result]);

		// csstree.walk(ast, async function(node, item, list) {
		// 	if (list) {
		// 		if (this.rule && node.type === 'Url') {
		// 			const value = node.value.value;
		// 			if (value.indexOf("data:image") === -1) {
		// 				let url = "m2units/" + path + value.replace(/"/g, "");
		// 				if (revision) {
		// 					if (url.indexOf('?') > -1) {
		// 						url = `${url}&rev=${revision}`
		// 					} else {
		// 						url = `${url}?rev=${revision}`
		// 					}
		// 				}
		// 				await fetch(url)
		// 					.then(r => r.blob())
		// 					.then(FileReader)
		// 					.then(({target: {result: base64}}) => {
		// 						node.value.value = base64;
		// 					})
		// 			}
		// 		} else if (this.atrule && this.atrule.name && node.type === 'Url') {
		// 			const value = node.value.value;
		// 			if (value.indexOf("data:image") === -1) {
		// 				let url = "m2units/" + path + value.replace(/"/g, "");
		// 				if (revision) {
		// 					if (url.indexOf('?') > -1) {
		// 						url = `${url}&rev=${revision}`
		// 					} else {
		// 						url = `${url}?rev=${revision}`
		// 					}
		// 				}
		// 				await fetch(url)
		// 					.then(r => r.blob())
		// 					.then(FileReader)
		// 					.then(({target: {result: base64}}) => {
		// 						node.value.value = base64;
		// 					})
		// 			}
		// 		}
		// 	}
		// });

		// const result = csstree.generate(ast, { sourceMap: false });
		// const commonStyle = document.createElement("style");
		// commonStyle.append(result);

		// Promise.all(
		// 	targets.map(({raw, type}) => {
		// 		if (type === "font") {
		// 			return new FontFaceObserver(raw).load(null, FONT_LOADING_TIMEOUT);
		// 		} else if (type === "img") {
		// 			return new ImagePreloader().preload(raw);
		// 		}
		// 	})
		// ).then(() => {
		// 	if (isActive) {
		// 	    inject(commonStyle, priority);
		// 		emt({type: "inline-style", style: commonStyle, ...args});
		// 	}
		// });

		sweep.add(() => {
			isActive = false;
			commonStyle.remove();
			fontFaceStyle && fontFaceStyle.remove();
		});
	});
}
