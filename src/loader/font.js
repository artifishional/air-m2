import Observer from "fontfaceobserver"
const FONT_LOADING_TIMEOUT = 30000;

export default (resourceloader, {path}, {url, revision, family, size, ...args}) => new Promise(() => {
    const style = document.createElement("style");
    style.textContent =
        `@font-face { 
                font-family: '${family}'; 
                src: url('${revision ? `${url}?rev=${revision}` : url}') format('${ /\.[a-z0-9]{3,4}$/g.exec(url)[0].replace(".", "") }'); 
            }`;
    document.head.appendChild(style);
    new Observer(family)
        .load(null, FONT_LOADING_TIMEOUT)
        .then( () => ({
            type: "font", font: { fontFamily: family, fontSize: size, ...args }
        }) )
});