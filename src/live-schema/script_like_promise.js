export default (resourceloader, {path}, {url, ...args}) =>
  resourceloader(resourceloader, {path}, {url, ...args, type: 'content'})
    .then(scriptContent => {
      const script = document.createElement('script');
      script.textContent = scriptContent;
      document.body.appendChild(script);
      script.remove();
      return {module: window.__m2unit__, script};
    });
