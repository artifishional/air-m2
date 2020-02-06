export default (resourceloader, {path}, {urlOrigin, url, revision, ...args}) =>
    resourceloader(resourceloader, {path}, {...args, urlOrigin, url, revision, type: 'content'})
    .then(styleContent => {
        url = new URL(`${urlOrigin}/m2units/${path}${url}`).href;
        const style = document.createElement('script');
        style.textContent = styleContent;
        return {url, type: "style", style, ...args};
    })