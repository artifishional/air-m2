import { stream } from "air-stream";
import csstree from "css-tree";
import FontFaceObserver from "fontfaceobserver";
import ImagePreloader from "image-preloader";

const FONT_LOADING_TIMEOUT = 30000;

export default ({ style, path, ...args }) =>
  stream((emt, { sweep }) => {
    const commonStyle = document.createElement("style");
    commonStyle.type = "text/css";
    commonStyle.textContent = "";

    const targets = [];
    let rawFontCSSContent = "";
    let rawCommonCSSContent = "";

    const ast = csstree.parse(style.textContent);
    ast.children.forEach(node => {
      const { type, name, block } = node;
      if (type === "Atrule" && name === "font-face") {
        block.children.forEach(prop => {
          const { type, property, value } = prop;
          if (type === "Declaration" && property === "font-family") {
            value.children.forEach(e => {
              targets.push({ raw: e.value.replace(/"/g, ""), type: "font" });
            });
          }
          if (type === "Declaration" && property === "src") {
            value.children.forEach(e => {
              const { type, value } = e;
              if (type === "Url") {
                e.value.value = "m2units/" + path + value.value.replace(/"/g, "");
              }
            });
          }
        });
        rawFontCSSContent += csstree.generate(node);
      } else if (type === "Rule") {
        block.children.forEach(prop => {
          const { property, value } = prop;
          if (property === "background-image" || property === "background") {
            value.children.forEach(e => {
              const { type, value } = e;
              if (type === "Url") {
                const v = "m2units/" + path + value.value.replace(/"/g, "");
                value.value = v;
                targets.push({ raw: v, type: "img" });
              }
            });
          }
        });
        rawCommonCSSContent += csstree.generate(node);
      } else {
        rawCommonCSSContent += csstree.generate(node);
      }
    });

    commonStyle.textContent = rawCommonCSSContent;
    if (rawCommonCSSContent) {
      const fontFaceStyle = document.createElement("style");
      fontFaceStyle.textContent = rawFontCSSContent;
      fontFaceStyle.type = "text/css";
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
      document.head.appendChild(commonStyle);
      emt({ type: "inline-style", style: commonStyle, ...args });
    });

    sweep.add(() => {
      commonStyle.remove();
      fontFaceStyle && fontFaceStyle.remove();
    });
  });
