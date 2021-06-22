import { PORT as port } from './../globals';
const {protocol, hostname} = window.location;
const urlOrigin = port ? `${protocol}//${hostname}:${port}` : window.location.origin;

export default (resourceloader, { path }, { url, revision }) => {
  url = new URL(`${urlOrigin}/m2units/${path}${url}`);
  if (revision) {
    url.searchParams.append("revision", revision);
  }
  return fetch(url.href, {
    mode: 'cors',
    method: 'GET',
    headers: {'Content-Type': 'text'}
  })
    .then(response => response.text());
}
