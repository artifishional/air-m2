export default (resourceloader, {path}, {url}) => new Promise(resolve => {
  return resourceloader({path}, {url, type: 'content'})
    .then(raw => {
      resolve({ content: JSON.parse(raw) });
    })
});
