/* jshint node: true */
/* global require, module */

var mergeTrees = require('broccoli-merge-trees');
var babelTranspiler = require('broccoli-babel-transpiler');
var Funnel = require('broccoli-funnel');
var concat = require('broccoli-concat');
var HtmlbarsCompiler = require('ember-cli-htmlbars');
// var buildIgnore = require('../../mobile/build-ignore.json');

var appRoot = './app';

var findIgnoreFiles = function () {
    console.log('\nfinding ignore files');

    var ignorePaths = [];

    buildIgnore.files.forEach(function (file) {
        ignorePaths.push(file);
    });

    buildIgnore.paths.forEach(function (file) {
        ignorePaths.push(file);
    });

    return ignorePaths;
};

// var excludes = findIgnoreFiles();

// Use funnel to select entire files in a folder
appRoot = new Funnel(appRoot, {
    // exclude: ['**/*']
});

// Turns template files into ES6 JavaScript modules
var appTemplate = new HtmlbarsCompiler(appRoot, {
  isHTMLBars: true,

  // provide the templateCompiler that is paired with your Ember version
  templateCompiler: require('./bower_components/ember/ember-template-compiler')
});

// include app, styles and vendor trees
var sourceTrees = new mergeTrees([appRoot, appTemplate], {overwrite: true});

var appTree = babelTranspiler(sourceTrees, {
  browserPolyfill: true,
  moduleIds: true,

  presets: ['es2015'],

  // modules: 'amd',
  plugins: [['transform-es2015-modules-commonjs', {loose: true, strict: true, noInterop: true}], ['transform-es2015-modules-amd']],

  getModuleId: function (name) {
    console.log(name);

    return 'universal-app/' + name; // TODO: [satheeqh] Update this with module name
  }
});

appTree = concat(appTree, {
  inputFiles: ['**/*.js'],
  outputFile: 'ua-price' + '.js',
    sourceMapConfig: {enabled: true},
});

// Enable uglify for stand-alone addons
// var appJs = uglifyJavaScript(appTree, {
//     mangle: false,
//     compress: false
// });

module.exports = mergeTrees([appTree]);

/*
 echo "clean" && rm -rf dist && echo "cleaned" && broccoli build dist
 */
