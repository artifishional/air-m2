export default (resourceloader, {path}, {url, revision}) => {
  return resourceloader({path}, {url, revision, port, type: 'content'})
    .then((content) => {
      return { type: "intl", content };
    })
};