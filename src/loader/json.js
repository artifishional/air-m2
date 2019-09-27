import { stream } from 'air-stream';

export default ({path, revision}) => stream(emt => {
  const url = revision ? `${path}?rev=${revision}` : path;
  fetch(url, {
    mode: 'cors',
    method: 'GET',
  })
    .then(r => r.json())
    .then((content) => {
      emt({ content });
    })
});