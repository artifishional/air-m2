export default (resourceloader, {url: path, revision}) => {
  return resourceloader({path, revision, port, type: 'content'})
    .then((content) => {
      return { type: "intl", content };
    })
};