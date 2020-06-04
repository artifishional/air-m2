export default (resourceloader, {path}, {url, ...args}) =>
  resourceloader(resourceloader, {path}, {url, ...args, type: 'content'})
    .then((scriptContent) => {
      const script = document.createElement('script');
      script.textContent = scriptContent;
      document.head.appendChild(script);
      script.remove();
      return {module: window.__m2unit__, script};
    });
