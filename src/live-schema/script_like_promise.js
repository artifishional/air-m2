export default function (resourceloader, {path}, {url}) {
    return new Promise(async resolve => {
        const scriptContent = await resourceloader({path}, {url, type: 'content'});
        window.eval(scriptContent);
        resolve({module: window.__m2unit__});
    });
}