import Ember from 'ember';
import sharedService from '../../models/shared/shared-service';
import utils from '../../utils/utils';

export default Ember.Controller.extend({
    resendSubscriptions: false,

    /* *
     * Authenticate user
     * @param username Username
     * @param password Password
     * @param allowInit Allow application to initialize before login
     * @private
     */
    authenticateUser: function (username, password, allowInit, authSuccess, authFail) {
        var that = this;
        var priceService = sharedService.getService('price');

        // Initialize application if and only if the given user is the last successfully logged-in user
        authSuccess(username, password, allowInit);

        priceService.authenticateWithUsernameAndPassword({
            username: username,
            password: password,
            resendSubscriptions: that.resendSubscriptions,

            authSuccess: function () {
                utils.logger.logTrace('Authentication success triggered in price-retail-authenticator');

                if (!sharedService.getService('sharedUI').isDelayedUserLogged) {
                    sharedService.userSettings.set('username', sharedService.getService('price').userDS.get('username'));
                    sharedService.userSettings.save();
                }

                // Initialize application if and only if the given user is the last successfully logged-in user
                authSuccess(username, password, !allowInit);
            },

            authFailed: function (reason) {
                utils.logger.logTrace('Authentication failure triggered in trade-retail-authenticator');

                that.resendSubscriptions = true;
                priceService.webSocketManager.closeConnection(priceService.constants.SocketConnectionType.QuoteServer);

                authFail(reason, username, password);
            }
        });
    }
}).create();
