const { resolve } = require('path');

module.exports = (cli, config) => ([
  {
    handler: 'rollup',
    name: 'core-app-front',
    src: resolve(__dirname, '../src/CoreBundle/Resources/private/js/app/index.js'),
    concat: 'core-app-front.min.js',
    dest: config.path.js,
  },
  {
    handler: 'rollup',
    name: 'core-app-admin',
    src: resolve(__dirname, '../src/Admin/CoreBundle/Resources/private/js/app/index.js'),
    concat: 'core-app-admin.min.js',
    dest: config.path.js,
  },
  {
    handler: 'css',
    src: resolve(__dirname, '../src/CoreBundle/Resources/private/css/legacy.css'),
    concat: 'legacy.css',
    dest: config.path.css,
  },
  {
    handler: 'css',
    src: resolve(__dirname, '../src/CoreBundle/Resources/private/css/button.css'),
    concat: 'button.css',
    dest: config.path.css,
  },
  {
    handler: 'sass',
    src: resolve(__dirname, '../src/CoreBundle/Resources/private/sass/grid.scss'),
    concat: 'my-grid.css',
    dest: config.path.css,
  },
  {
    handler: 'image',
    src: resolve(__dirname, '../src/CoreBundle/Resources/private/img/*'),
    dest: config.path.img,
  },
  {
    handler: 'file',
    src: resolve(__dirname, '../src/CoreBundle/Resources/private/plugins/jQuery-Validation-Engine/**/*'),
    dest: `${config.path.plugins}/jQuery-Validation-Engine`,
  },
  {
    handler: 'rollup',
    name: 'yprox-media-browser',
    src: resolve(__dirname, '../src/Admin/MediaManagerBundle/Resources/private/js/yprox-media-browser/index.js'),
    concat: 'yprox-media-browser.min.js',
    dest: config.path.js,
  },
  {
    handler: 'rollup',
    name: 'yprox-store-locator',
    src: resolve(__dirname, '../src/StoreLocatorBundle/Resources/private/js/yprox-store-locator/index.js'),
    concat: 'yprox-store-locator.min.js',
    dest: config.path.js,
  },
]);
