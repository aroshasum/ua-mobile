import Ember from 'ember';
import utils from '../../utils/utils';
import sharedService from '../../models/shared/shared-service';
import appConfig from '../../config/app-config';
import authenticationConstants from '../../controllers/authentication/authentication-constants';

export default Ember.Controller.extend({
    /* *
     * Authenticate user
     * @param ssoToken SSO token
     * @private
     */
    authenticateUser: function (ssoToken, authSuccess, authFail) {
        var priceService = sharedService.getService('price');

        priceService.authenticateWithSsoToken({
            ssoToken: ssoToken,
            ssoType: utils.Constants.SsoTypes.Price,

            authSuccess: function () {
                utils.logger.logTrace('Authentication success triggered in price-sso-authenticator');

                sharedService.userSettings.set('username', priceService.userDS.get('username'));
                sharedService.userSettings.save();

                authSuccess();

                if (authenticationConstants.AuthModes.PriceSsoTradeSso === appConfig.customisation.authenticationMode) {
                    var tradeService = sharedService.getService('trade');

                    if (tradeService) {
                        tradeService.authenticateWithSsoToken({
                            // TODO: [Bashitha] Call trade sso authentication
                        });
                    }
                }
            },

            authFailed: function (reason) {
                utils.logger.logTrace('Authentication failure triggered in price-sso-authenticator');

                priceService.webSocketManager.closeConnection(priceService.constants.SocketConnectionType.QuoteServer);
                authFail(reason);
            }
        });
    }
}).create();
