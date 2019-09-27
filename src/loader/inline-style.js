import { stream } from "air-stream";
import csstree from "css-tree";
import FontFaceObserver from "fontfaceobserver";

const FONT_LOADING_TIMEOUT = 30000;

function FileReader(blob) {
	return new Promise( (resolver) => {
		const reader = new globalThis.FileReader();
		blob.arrayBuffer().then(buffer => {
			// todo: implement load strategy mechanism instead creating new blob instance
			reader.readAsDataURL(new Blob([buffer], {type: blob.type}));
			reader.onloadend = resolver;
		});
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
		const commonStyle = document.createElement("style");
		commonStyle.textContent = "";

		let rawFontCSSContent = "";
		let rawCommonCSSContent = "";

		let fontStyle = null;

		const ast = csstree.parse(style.textContent);

		const dataForLoading = [];
		const fonts = [];

		csstree.walk(ast, function(node) {
			if (this.atrule && this.atrule.name === 'font-face') {
				if (node.type === "Declaration" && node.property === 'font-family') {
					const values = node.value && node.value.children && node.value.children
						.toArray()
						.map(({value}) => value.replace(/"/g, ""));
					if (values) {
						fonts.push({
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
							let url = path + value.value.replace(/"/g, "");
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
				const url = new URL(
					path + resource.replace(/"/g, ""),
				);
				if (revision) {
					url.searchParams.append("revision", revision);
				}
				return fetch(url, {
					mode: 'cors',
					method: 'GET'
				})
					.then(r => r.blob())
					.then(FileReader)
					.then(({target: {result: base64}}) => {
						target.value = base64;
					})
			}
		});

		Promise.all(promises).then(() => {
			for (const node of ast.children.toArray()) {
				const {type, name} = node;
				if (type === "Atrule" && name === "font-face") {
					rawFontCSSContent += csstree.generate(node);
				} else {
					rawCommonCSSContent += csstree.generate(node);
				}
			}
			commonStyle.textContent = rawCommonCSSContent;
			if (rawFontCSSContent) {
				fontFaceStyle = document.createElement("style");
				fontFaceStyle.textContent = rawFontCSSContent;
				document.head.appendChild(fontFaceStyle);
			}
			Promise.all(
				fonts.reduce((acc, {resource}) => {
					const fontPromises = resource.map((res) => {
						return new FontFaceObserver(res).load(null, FONT_LOADING_TIMEOUT);
					});
					return [
						...acc,
						...fontPromises
					]
				}, [])
			).then(() => {
				if (isActive) {
					inject(commonStyle, priority);
					emt({type: "inline-style", style: commonStyle, ...args});
				}
			})
		});

		sweep.add(() => {
			isActive = false;
			commonStyle.remove();
			fontStyle && fontStyle.remove();
		});
	});
}
