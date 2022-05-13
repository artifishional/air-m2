const schtypes = {
  js: '/index.js',
  json: '/index.json',
  html: '/index.html',
};

export default class Loader {
  constructor({ path = 'm2units/' } = {}) {
    this.rpath = path;
    this.modules = [];
  }

  obtain({ path: _path, schtype = 'js' }, resourceloader) {
    if (!_path) throw new Error("'path' param is required");
    const path = (_path + schtypes[schtype]).replace(/\.\//g, '');
    const exist = this.modules.find(({ path: x }) => path === x);
    if (exist) {
      return exist.module;
    }

    let module = null;
    if (schtype === 'html') {
      module = resourceloader(resourceloader, { path: `${_path}/` }, { url: schtypes[schtype], type: 'html' })
        .then((html) => ({ data: html.content, pack: { cache: {}, path: `${_path}/` } }));
    } else {
    /* todo es6 dynamic
    eval(`import("./${this.rpath}${path}")`).then(module => {
        emt({data: module});
    } );
    */
      module = resourceloader(
        resourceloader,
        { path: `${_path}/` },
        { url: schtypes[schtype], type: 'script' },
      )
        .then(({ module: data }) => ({ data, pack: { cache: {}, path: `${_path}/` } }));
    /*
    include({path: `${this.rpath}${path}`, revision}).then(({module}) => {
        emt( { data: module, pack: { path: _path + "/" } } );
    } ); */
    }
    this.modules.push({ module, path });
    return module;
  }

  // static default = new Loader();
}

Loader.default = new Loader();
