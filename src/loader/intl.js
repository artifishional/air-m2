export default ({url: path, revision}) => {
  let url = revision ? `${path}?rev=${revision}` : path;
  return fetch(url, {
    mode: 'cors',
    method: 'GET',
  })
    .then(r => r.json())
    .then((content) => {
      return { type: "intl", content };
    })
};