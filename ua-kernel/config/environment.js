/* jshint node: true */
var EnvironmentExtended = require('./environment-extended.js');

module.exports = function (environment) {
    var ENV = new EnvironmentExtended(environment);
    ENV.contentSecurityPolicy['connect-src'] = "'self' www.google-analytics.com wss://data-sa9.mubasher.net/html5-Retail";

    if (ENV.APP.isTestMode) {
        ENV.APP.priceConnectionParameters = {
            primary: {
                ip: 'data-sa9.mubasher.net/html5-Retail',
                port: '',
                secure: true
            }
        };

        ENV.contentSecurityPolicy['connect-src'] = "'self' www.google-analytics.com wss://data-sa9.mubasher.net/html5-Retail";
    }

    return ENV;
};
