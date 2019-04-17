import { stream } from "air-stream";
import csstree from "css-tree";
import FontFaceObserver from "fontfaceobserver";
import ImagePreloader from "image-preloader";

export default ({ style, path, ...args }) =>
  stream((emt, { sweep }) => {
    const fontFaceStyle = document.createElement("style");
    const otherStyle = document.createElement("style");
    fontFaceStyle.type = otherStyle.type = "text/css";
    fontFaceStyle.textContent = otherStyle.textContent = "";

    const observers = [];
    const fonts = [];
    const images = [];

    const ast = csstree.parse(style.textContent);
    ast.children.forEach(node => {
      const { type, name, block } = node;
      if (type === "Atrule" && name === "font-face") {
        block.children.forEach(prop => {
          const { type, property, value } = prop;
          if (type === "Declaration" && property === "font-family") {
            value.children.forEach(e => {
              fonts.push(e.value.replace(/"/g, ""));
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
        fontFaceStyle.textContent += csstree.generate(node);
      } else if (type === "Rule") {
        block.children.forEach(prop => {
          const { property, value } = prop;
          if (property === "background-image" || property === "background") {
            value.children.forEach(e => {
              const { type, value } = e;
              if (type === "Url") {
                const v = "m2units/" + path + value.value.replace(/"/g, "");
                value.value = v;
                images.push(v);
              }
            });
          }
        });
        otherStyle.textContent += csstree.generate(node);
      } else {
        otherStyle.textContent += csstree.generate(node);
      }
    });
    if (fontFaceStyle.textContent !== "") {
      document.head.appendChild(fontFaceStyle);
    }

    images.forEach(img => {
      observers.push(new ImagePreloader().preload(...images));
    });
    fonts.forEach(fontName => {
      observers.push(new FontFaceObserver(fontName).load(null, 30000));
    });

    Promise.all(observers).then(() => {
      document.head.appendChild(otherStyle);
      emt({ type: "inline-style", style: otherStyle, ...args });
    });

    sweep.add(() => style.remove());
  });
