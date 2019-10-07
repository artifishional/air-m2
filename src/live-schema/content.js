export default ({path}, {url, revision, port}) => {
  url = `m2units/${path}${url}`;
  if (revision) {
    url.searchParams.append("revision", revision);
  }
  if (port) {
    url.port = port;
  }
  return fetch(url, {
    mode: 'cors',
    method: 'GET',
    headers: {'Content-Type': 'text'}
  })
    .then( response => response.text() );
}