import { stream } from "air-stream";
import csstree from "css-tree";
import FontFaceObserver from "fontfaceobserver";
import ImagePreloader from "image-preloader";

const FONT_LOADING_TIMEOUT = 30000;

export default ({ style, path, ...args }) =>
  stream(async (emt, { sweep }) => {
    let isActive = true;
    let fontFaceStyle = null;
    const commonStyle = document.createElement("style");
    commonStyle.textContent = "";

    const targets = [];
    let rawFontCSSContent = "";
    let rawCommonCSSContent = "";

    const ast = csstree.parse(style.textContent);
    for (const node of ast.children.toArray()) {
      const { type, name, block } = node;
      if (type === "Atrule" && name === "font-face") {
        for (const prop of block.children.toArray()) {
          const { type, property, value } = prop;
          if (type === "Declaration" && property === "font-family") {
            for (const e of value.children.toArray()) {
              targets.push({ raw: e.value.replace(/"/g, ""), type: "font" });
            }
          }
          if (type === "Declaration" && property === "src") {
            for (const e of value.children.toArray()) {
              const { type, value } = e;
              if (type === "Url") {
                e.value.value = "m2units/" + path + value.value.replace(/"/g, "");
              }
            }
          }
        }
        rawFontCSSContent += csstree.generate(node);
      } else if (type === "Rule") {
        for (const prop of block.children.toArray()) {
          const { property, value } = prop;
          if (property === "background-image" || property === "background") {
            for (const e of value.children.toArray()) {
              const { type, value } = e;
              if (type === "Url") {
                const v = "m2units/" + path + value.value.replace(/"/g, "");
                await fetch(v).then(r => r.blob()).then((blob) => {
                  const url = URL.createObjectURL(blob);
                  value.value = url;
                  targets.push({ raw: url, type: "img" });
                })
              }
            }
          }
          rawCommonCSSContent += csstree.generate(node);
        }
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
      targets.map(({ raw, type }) => {
        if (type === "font") {
          return new FontFaceObserver(raw).load(null, FONT_LOADING_TIMEOUT);
        } else if (type === "img") {
          return new ImagePreloader().preload(raw);
        }
      })
    ).then(() => {
      if (isActive) {
        document.head.appendChild(commonStyle);
        emt({ type: "inline-style", style: commonStyle, ...args });
      }
    });

    sweep.add(() => {
      isActive = false;
      commonStyle.remove();
      fontFaceStyle && fontFaceStyle.remove();
    });
  });
