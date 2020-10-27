/* global require, module */
/* For test automation its required to pass environment as automation but build application in production mode.
process.env.EMBER_ENV - represent the environment while building the app. So need to update it using environment.js before app build.*/
/*Environment.js get initialized multiple times from various places, so couldn't pass the values from outside. Only First time get initialized
as the environment passed initially. After environment get changed variables declared in first declaration get ignored. So had to save initial
environment object in process.env.FIRST_EMBER_ENV (custom parameter introduced) and check if it exists then return that environment object.
 */

var Environment = require('./config/environment.js');
var ENV_BROC = new Environment(process.env.EMBER_ENV);
process.FIRST_EMBER_ENV = ENV_BROC;
process.env.EMBER_ENV = ENV_BROC.environment;

var Funnel = require('broccoli-funnel');
var concat = require('broccoli-concat');
var uglifyJavaScript = require('broccoli-uglify-js');
var MergeTrees = require('broccoli-merge-trees');
// var buildIgnore = require('./build-ignore.json');
var preBuildScript = require('./pre-build-script');

var EmberApp = require('ember-cli/lib/broccoli/ember-app');
var env = EmberApp.env();

var isProductionBuild = (env === 'production');

preBuildScript.buildModules();

if (!isProductionBuild) {
    preBuildScript.applyWatcher();
}

/*var findIgnoreFiles = function () {
    console.log('\nfinding ignore files');

    var ignorePaths = [];

    buildIgnore.files.forEach(function (file) {
        ignorePaths.push(file);
    });

    buildIgnore.paths.forEach(function (file) {
        ignorePaths.push(file);
    });

    // console.log(ignorePaths);

    return ignorePaths;
};

var excludes = findIgnoreFiles();*/


var app = new EmberApp({
    minifyCSS: {
        enabled: false
    },
    minifyJS: {
        enabled: isProductionBuild
    },
    fingerprint: {
        enabled: isProductionBuild,
        customHash: new Date().getTime()
    },
    wrapInEval: false,

    funnel: {
        enabled: true,
        // These files are not required in module build.
        // exclude: excludes
    }
});

// Use `app.import` to add additional libraries to the generated
// output files.
//
// If you need to use different assets in different
// environments, specify an object as the first parameter. That
// object's keys should be the environment name and the values
// should be the asset to use in that environment.
//
// If the library that you are including contains AMD or ES6
// modules that you would like to import into your application
// please specify an object with the list of modules as keys
// along with the exports of each module as its value.


// app.import('vendor/queue.js');
// app.import('vendor/base64.js');
// app.import('vendor/bootstrap/bootstrap.min.js');
//
// app.import('bower_components/c3/c3.min.js');

// app.import('vendor/chartiq/stxThirdParty.js');
// app.import('vendor/chartiq/stx.js');
// app.import('vendor/chartiq/stxKernelOs.js');
// app.import('vendor/chartiq/stxLibrary.js');
// app.import('vendor/chartiq/stxAdvanced.js');

// Custom
// app.import('vendor/jqvmap/dist/jquery.vmap.js');
// app.import('vendor/jqvmap/dist/maps/jquery.vmap.world.js');

// app.import('vendor/chartiq/stxShare.js');

// To enable client-side compilation, you should add ember-template-compiler to the Brocfile
// Since Ember.js 1.10 template compiler is part of Ember, so all you have to do to compile templates in client side is to add following line in your Brocfile
// http://stackoverflow.com/questions/28213301/ember-js-htmlbars-and-the-handlebars-compile-command
// app.import('bower_components/ember/ember-template-compiler.js');

// app.import('vendor/draggabilly.pkgd.js');
// app.import('vendor/moment-with-locales.js');
// app.import('vendor/triple-des-3.1.2.js');
// app.import('vendor/lz-string.min.js');
// app.import('vendor/sha.js');
// app.import('vendor/hint.css');

// Grid-stack
// app.import('vendor/lodash.min.js');
// app.import('vendor/gridstack.js');
// app.import('vendor/gridstack.css'); // Not for mobile
// app.import('vendor/jquery.nanoscroller.min.js');
app.import('vendor/nanoscroller.css');

// Key Board Action
// app.import('vendor/mousetrap.js');

// app.import('bower_components/bootstrap-datepicker/js/bootstrap-datepicker.js');
// app.import('bower_components/bootstrap-datepicker/dist/locales/bootstrap-datepicker.ar.min.js');

// app.import('vendor/hammer.js'); // Only for mobile
// app.import('vendor/html2canvas.js'); // Custom

// Virtual Key Board
// app.import('vendor/jQKeyboard.js'); // Custom
// app.import('vendor/jQKeyboard.css'); // Custom

// app.import('vendor/calendar/jquery.plugin.js'); // Custome
// app.import('vendor/calendar/jquery.calendars.js');
// app.import('vendor/calendar/jquery.calendars.plus.js');
// app.import('vendor/calendar/jquery.calendars.islamic.js');
// app.import('vendor/calendar/jquery.calendars.islamic-ar.js');
// app.import('vendor/calendar/jquery.calendars.picker.js');
// app.import('vendor/calendar/jquery.calendars.picker-ar.js');
// app.import('vendor/calendar/jquery.calendars.picker.css');


// TODO : [Champaka] Enable after PDF finalized.
// jsPDF
// app.import('bower_components/jspdf/dist/jspdf.min.js');
// app.import('bower_components/jspdf-autotable/dist/jspdf.plugin.autotable.js');


var vendorDir = new Funnel('vendor', {
    include: ['**/*']
});

var bowerDir = new Funnel('bower_components', {
    include: ['**/*']
});

var libTree = new MergeTrees([vendorDir, bowerDir]);

var preLib = concat(libTree, {
    headerFiles: ['ember/ember-template-compiler.js', 'lodash.min.js', 'jquery.nanoscroller.min.js', 'draggabilly.pkgd.js', 'moment-with-locales.js', 'triple-des-3.1.2.js', 'lz-string.min.js', 'sha.js',
        'queue.js', 'base64.js', 'hammer.js'],

    outputFile: 'assets/pre-lib.js',
});

var postLib = concat(libTree, {
    headerFiles: ['bootstrap/bootstrap.min.js', 'bootstrap-datepicker/dist/js/bootstrap-datepicker.min.js', 'bootstrap-datepicker/dist/locales/bootstrap-datepicker.ar.min.js', 'antiscroll/antiscroll.js',
         'mousetrap.js', 'c3/c3.min.js'],

    outputFile: 'assets/post-lib.js'
});

if (isProductionBuild) {
    preLib = uglifyJavaScript(preLib, {
        mangle: false,
        compress: false
    });

    postLib = uglifyJavaScript(postLib, {
        mangle: false,
        compress: false
    });
}

module.exports = app.toTree([preLib, postLib]);
