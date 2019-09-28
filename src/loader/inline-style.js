import { stream } from "air-stream";
import csstree from "css-tree";

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

export default ({ loadResource, acid, priority, style, path, revision, ...args }) => {

	return new Promise(async (resolve) => {

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
							resource: values[0],
							target: null,
							urls: [],
						})
					}
				} else if (node.type === "Declaration" && node.property === 'src') {
					node.value && node.value.children && node.value.children
						.toArray()
						.filter(({type}) => type === 'Url')
						.map(({value}) => {
							const url = value.value.replace(/"/g, "");
							fonts.slice(-1)[0].urls.push(url);
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
				loadResource({path}, {url: resource.replace(/"/g, ""), type: 'img', toDataURL: true, revision})
					.then(({image}) => target.value = image);
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
				fonts.reduce((acc, {resource: fontFamily, urls}) => {
					const fontPromises = urls.map(fontUrl =>
						loadResource({path}, {url: fontUrl, type: 'font', family: fontFamily})
					);
					return [
						...acc,
						...fontPromises
					]
				}, [])
			).then(() => {
				if (isActive) {
					inject(commonStyle, priority);
					resolve({type: "inline-style", style: commonStyle, ...args});
					// todo: не знаю пока куда впилить этот кусок
					// isActive = false;
					// commonStyle.remove();
					// fontStyle && fontStyle.remove();
				}
			})
		});
	});
}
