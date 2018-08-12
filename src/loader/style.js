import {stream} from "air-stream"

export default ({url, ...args}) => stream((emt, {sweep}) => {
    const style = document.createElement("link");
    style.setAttribute("rel", "stylesheet");
    style.setAttribute("href", url);
    document.head.append(style);
    style.onload = () => emt({url, type: "style", style, ...args});
    sweep.add(() => style.remove());
});