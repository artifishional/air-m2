import { stream } from 'air-stream';
import FontFaceObserver from 'fontfaceobserver';

const FONT_LOADING_TIMEOUT = 30000;

function FileReader (blob) {
	return new Promise((resolver) => {
		const reader = new globalThis.FileReader();
		reader.readAsDataURL(blob);
		reader.onloadend = resolver;
	});
}

function createPrioritySystemStyle (priority) {
	while (PRIORITY.length < priority + 1) {
		const style = document.createElement('style');
		PRIORITY.push(style);
		style.setAttribute('data-priority', `${PRIORITY.length - 1}`);
		PRIORITY[PRIORITY.length - 2].before(style);
	}
}

function inject (style, priority) {
	createPrioritySystemStyle(priority);
	PRIORITY[priority].after(style);
}

const PRIORITY = [];

export default ({ acid, priority, style, path, revision, ...args }) => {

	return stream((emt, { sweep }) => {

		if (!PRIORITY[0]) {
			const zero = document.createElement('style');
			zero.setAttribute('data-priority', '0');
			document.head.append(zero);
			PRIORITY[0] = zero;
		}

		const fonts = [];
		let fontFaceStyle = null;
		let rawFontCSSContent = '';
		const fontRegex = /@font-face\s*{[^}]+}/gm;
		const fontFaceMatches = style.textContent.matchAll(fontRegex);
		if (fontFaceMatches) {
			for (const [fontFaceMatch] of fontFaceMatches) {
				const fontFamilyMatch = fontFaceMatch.match(/font-family:\s*['"]([^'"]+)['"]/);
				if (fontFamilyMatch) {
					if (fonts.indexOf(fontFamilyMatch[1]) === -1) {
						fonts.push(fontFamilyMatch[1]);
					}

					rawFontCSSContent += fontFaceMatch.replace(/url\(['"]?([^\'")]+)['"]?\)/gm, (_, resource) => {
						const url = new URL(
							'm2units/' + path + resource,
							window.location.origin + window.location.pathname
						);
						if (revision) {
							url.searchParams.append('revision', revision);
						}
						return `url("${url}")`;
					});
				}
			}
			style.textContent = style.textContent.replace(fontRegex, '');

			fontFaceStyle = document.createElement('style');
			fontFaceStyle.textContent = rawFontCSSContent;
			document.head.appendChild(fontFaceStyle);
		}

		const dataForLoading = [];
		let rawCommonCSSContent = '';
		const commonStyle = document.createElement('style');
		commonStyle.textContent = '';
		rawCommonCSSContent = style.textContent.replace(/:scope/g, `[data-scope-acid-${acid}]`);
		const imageRegex = /\/\*\s<image\surl=\"([^"]+)">\s\*\//gm;
		const matches = rawCommonCSSContent.matchAll(imageRegex);
		if (matches) {
			for (const match of matches) {
				dataForLoading.push({
					type: 'image',
					placeholder: match[0],
					resource: match[1]
				});
			}
		}

		const promises = dataForLoading.map(({ type, placeholder, resource }) => {
			if (type === 'image') {
				const url = new URL(
					'm2units/' + path + resource.replace(/"/g, ''),
					window.location.origin + window.location.pathname
				);
				if (revision) {
					url.searchParams.append('revision', revision);
				}
				return fetch(url, {
					mode: 'cors',
					method: 'GET'
				})
					.then(r => r.blob())
					.then(FileReader)
					.then(({ target: { result: base64 } }) => {
						while (~rawCommonCSSContent.indexOf(placeholder)) {
							rawCommonCSSContent = rawCommonCSSContent.replace(placeholder, base64);
						}
					});
			}
		});

		promises.push(...fonts.map((font) => new FontFaceObserver(font).load(null, FONT_LOADING_TIMEOUT)))

		Promise.all(promises).then(() => {
			commonStyle.textContent = rawCommonCSSContent;
			inject(commonStyle, priority);
			emt({ type: 'inline-style', style: commonStyle, ...args });
		});

		sweep.add(() => {
			commonStyle.remove();
			fontFaceStyle && fontFaceStyle.remove();
		});
	});
}
