function executeModule(scriptContent, reject) {
    const script = document.createElement("script");
    script.addEventListener("error", reject);
    document.head.appendChild(script);
    script.textContent = scriptContent;
    script.remove();
    return window.__m2unit__;
}

export default function (resourceloader, {path}, {url, scriptContent}) {
    if (scriptContent) {
        return executeModule(scriptContent, () => {});
    }
    return new Promise(async (resolve, reject) => {
        scriptContent = await resourceloader(resourceloader, {path}, {url, type: 'content'});
        resolve({module: executeModule(scriptContent, reject)});
    });
}
