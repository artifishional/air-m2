export default ({path}, {urlOrigin, url, revision, ...args}) => new Promise(resolve => {
    url = new URL(`${urlOrigin}/m2units/${path}${url}`).href;
    const style = document.createElement("link");
    style.setAttribute("rel", "stylesheet");
    style.setAttribute("href", revision ? `${url}?rev=${revision}` : url);
    document.head.append(style);
    style.onload = () => {
        style.remove();
        resolve({url, type: "style", style, ...args});
    };
})