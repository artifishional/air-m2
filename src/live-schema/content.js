export default ({path}, {url, urlOrigin, revision}) => {
  url = new URL(`${urlOrigin}/m2units/${path}${url}`);
  if (revision) {
    url.searchParams.append("revision", revision);
  }
  return fetch(url.href, {
    mode: 'cors',
    method: 'GET',
    headers: {'Content-Type': 'text'}
  })
    .then( response => response.text() );
}