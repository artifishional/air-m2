export default async ({path}, {url, urlOrigin, revision}) => {
  url = new URL(`${urlOrigin}/m2units/${path}${url}`);
  if (revision) {
    url.searchParams.append("revision", revision);
  }
  const response = await fetch(url.href, {
    mode: 'cors',
    method: 'GET',
    headers: {'Content-Type': 'text'}
  });
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  return {arrayBuffer, type: blob.type};
}