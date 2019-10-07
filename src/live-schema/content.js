export default ({path, revision, port}) => {
  const url = new URL(path, window.location.origin + window.location.pathname);
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