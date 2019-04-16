import { stream } from "air-stream";
import csstree from "css-tree";
import FontFaceObserver from "fontfaceobserver";

export default ({ style, path, ...args }) =>
  stream((emt, { sweep }) => {
    const fontFaceStyle = document.createElement("style");
    const otherStyle = document.createElement("style");
    fontFaceStyle.type = otherStyle.type = "text/css";
    fontFaceStyle.textContent = otherStyle.textContent = "";

    const observers = [];
    const fonts = [];

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
      } else {
        otherStyle.textContent += csstree.generate(node);
      }
    });
    if (fontFaceStyle.textContent !== "") {
      document.head.appendChild(fontFaceStyle);
    }

    fonts.forEach(fontName => {
      observers.push(new FontFaceObserver(fontName).load(null, 30000));
    });

    Promise.all(observers).then(() => {
      document.head.appendChild(otherStyle);
      emt({ type: "inline-style", style: otherStyle, ...args });
    });

    sweep.add(() => style.remove());
  });
