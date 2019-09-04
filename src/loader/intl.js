import { stream2 as stream } from "./xhr"

export default ({ url }) => {
  return stream.from(fetch(url, {
    mode: 'cors',
    method: 'GET',
    headers: {'Content-Type': 'application/json'}
  })
    .then( raw => ({ type: "intl", content: JSON.stringify(raw) }) ));
}