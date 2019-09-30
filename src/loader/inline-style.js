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

		const commonStyle = document.createElement("style");
		commonStyle.textContent = "";

		let rawCommonCSSContent = "";

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
							family: values[0],
							target: null,
							formats: [],
						})
					}
				} else if (node.type === "Declaration" && node.property === 'src') {
					node.value && node.value.children && node.value.children
						.toArray()
						.filter(({type, name}) => type === 'Url' || (type === 'Function' && name === 'format'))
						.map((node) => {
							if (node.type === 'Url') {
								const url = node.value.value.replace(/"/g, "");
								fonts.slice(-1)[0].formats.push({url, name: null});
							} else if (node.type === 'Function') {
								const format = node.children.toArray()[0].value.replace(/"/g, "");
								fonts.slice(-1)[0].formats.slice(-1)[0].name = format;
							}
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
				return loadResource({path}, {url: resource.replace(/"/g, ""), type: 'img', dataURL: true, revision})
					.then(({image}) => target.value = image);
			}
		});

		Promise.all(promises).then(() => {
			for (const node of ast.children.toArray()) {
				const {type, name} = node;
				if (type !== "Atrule" || name !== "font-face") {
					rawCommonCSSContent += csstree.generate(node);
				}
			}
			commonStyle.textContent = rawCommonCSSContent;
			loadResource({path}, {fonts, type: 'font'}).then(() => {
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
