import { stream2 as stream } from 'air-stream';

export default ({ url }) =>
  stream.from(
    fetch(url, {
      mode: 'cors',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(raw => ({ type: 'intl', content: raw.json() }))
  )