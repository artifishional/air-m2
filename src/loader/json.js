export default (resourceloader, {path, revision}) => new Promise(resolve => {
  return resourceloader({path, revision, port, type: 'content'})
    .then(raw => {
      resolve({ content: JSON.parse(raw) });
    })
});
