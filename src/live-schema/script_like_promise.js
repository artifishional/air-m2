export default function (resourceloader, {path, revision, port}) {
    const url = new URL(path, window.location.origin + window.location.pathname);
    if (revision) {
        url.searchParams.append("revision", revision);
    }
    if (port) {
        url.port = port;
    }
    path = url.href;
    return new Promise(async resolve => {
        const scriptContent = await resourceloader(resourceloader, {path, revision, port, type: 'content'});
        window.eval(scriptContent);
        resolve({module: window.__m2unit__});
    });
}