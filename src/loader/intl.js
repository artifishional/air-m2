export default (resourceloader, {path}, {url}) => {
  return resourceloader(resourceloader, {path}, {url, type: 'json'})
    .then(({content}) => {
      return { type: "intl", content };
    })
};