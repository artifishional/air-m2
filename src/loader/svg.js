export default ({ path, revision }) => {
  const url = new URL(path, window.location.origin + window.location.pathname);
  if (revision) {
    url.searchParams.append('revision', revision);
  }
  return fetch(url, {
    mode: 'cors',
    method: 'GET',
    headers: { 'Content-Type': 'image/svg+xml' }
  })
    .then(response => response.text())
    .then(raw => {
      const doc = new DOMParser().parseFromString(raw, 'image/svg+xml');
      const err = doc.querySelector('parsererror');
      if (err) throw `${path} parser error: ${err.innerText}`;
      const wrap = new DOMParser().parseFromString('<div></div>', 'text/html');
      wrap.body.firstElementChild.appendChild(doc.children[0]);
      return { content: wrap.body.firstElementChild };
    });
}