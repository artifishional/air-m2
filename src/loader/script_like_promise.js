export default function ({path}) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = path;
        script.addEventListener("load", resolve);
        script.addEventListener("error", reject);
        document.head.appendChild(script);
    });
}