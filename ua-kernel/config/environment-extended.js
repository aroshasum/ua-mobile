/* jshint node: true */
var EnvironmentCore = require('./environment-core.js');

module.exports = function (environment) {
    var ENV = new EnvironmentCore(environment);

    ENV.baseURL = '/';
    ENV.locationType = 'none';

    return ENV;
};
