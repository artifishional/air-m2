export default (resourceloader, {path}, {url}) => resourceloader(resourceloader, {path}, {url, type: 'content'})
    .then(raw => {
      return { content: JSON.parse(raw) };
    });
