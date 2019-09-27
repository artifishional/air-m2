import { stream } from 'air-stream';

export default ({url: path, revision}) => stream(emt => {
  let url = revision ? `${path}?rev=${revision}` : path;
  fetch(url, {
    mode: 'cors',
    method: 'GET',
  })
    .then(r => r.json())
    .then((content) => {
      emt({ type: "intl", content });
    })
});