export default (resourceloader, {path}, {urlOrigin, url, revision, ...args}) => new Promise(resolve => {
  const style = document.createElement("link");
  style.setAttribute("rel", "stylesheet");
  style.setAttribute("href", revision ? `${url}?rev=${revision}` : url);
  document.head.append(style);
  style.onload = () => resolve({url, type: "style", style, ...args});
  // todo
  // sweep.add(() => style.remove());
});