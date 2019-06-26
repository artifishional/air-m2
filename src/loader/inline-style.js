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
		const commonStyle = document.createElement("style");
		commonStyle.textContent = "";
		
		const targets = [];
		let rawFontCSSContent = "";
		let rawCommonCSSContent = "";
		
		const ast = csstree.parse(style.textContent);
		for (const node of ast.children.toArray()) {
			const {type, name, block} = node;
			if (type === "Atrule" && name === "font-face") {
				for (const prop of block.children.toArray()) {
					const {type, property, value} = prop;
					if (type === "Declaration" && property === "font-family") {
						for (const e of value.children.toArray()) {
							targets.push({raw: e.value.replace(/"/g, ""), type: "font"});
						}
					}
					if (type === "Declaration" && property === "src") {
						for (const e of value.children.toArray()) {
							const {type, value} = e;
							if (type === "Url" && value.value.indexOf("data:image") === -1) {
								let url = "m2units/" + path + value.value.replace(/"/g, "");
								if (revision) {
									if (url.indexOf('?') > -1) {
										url = `${url}&rev=${revision}`
									} else {
										url = `${url}?rev=${revision}`
									}
								}
								e.value.value = "m2units/" + path + value.value.replace(/"/g, "");
							}
						}
					}
				}
				rawFontCSSContent += csstree.generate(node);
			} else if (type === "Rule") {
				for (const prop of block.children.toArray()) {
					const {property, value} = prop;
					if (property === "background-image" || property === "background") {
						for (const e of value.children.toArray()) {
							const {type, value} = e;
							if (type === "Url" && value.value.indexOf("data:image") === -1) {
								let url = "m2units/" + path + value.value.replace(/"/g, "");
								if (revision) {
									if (url.indexOf('?') > -1) {
										url = `${url}&rev=${revision}`
									} else {
										url = `${url}?rev=${revision}`
									}
								}
								await fetch(url)
									.then(r => r.blob())
									.then(FileReader)
									.then(({target: {result: base64}}) => {
										value.value = base64;
									})
							}
						}
					}
				}
				rawCommonCSSContent += csstree.generate(node);
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
			targets.map(({raw, type}) => {
				if (type === "font") {
					return new FontFaceObserver(raw).load(null, FONT_LOADING_TIMEOUT);
				} else if (type === "img") {
					return new ImagePreloader().preload(raw);
				}
			})
		).then(() => {
			if (isActive) {
			    inject(commonStyle, priority);
				emt({type: "inline-style", style: commonStyle, ...args});
			}
		});
		
		sweep.add(() => {
			isActive = false;
			commonStyle.remove();
			fontFaceStyle && fontFaceStyle.remove();
		});
	});
}
