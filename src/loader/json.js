export default ({path, revision}) => new Promise(resolve => {
  const url = revision ? `${path}?rev=${revision}` : path;
  fetch(url, {
    mode: 'cors',
    method: 'GET',
  })
    .then(r => r.json())
    .then((content) => {
      resolve({ content });
    })
});
