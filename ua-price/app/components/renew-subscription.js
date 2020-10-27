import Ember from 'ember';
import sharedService from '../models/shared/shared-service';
import appConfig from '../config/app-config';
import utils from '../utils/utils';

export default Ember.Component.extend({
    _renewSubscription: function () {
        window.open(this._generateRenewUrl(), '_blank');
    },

    _generateRenewUrl: function () {
        return utils.requestHelper.generateQueryString(appConfig.subscriptionConfig.renewSubscriptionPath, {
            user: sharedService.getService('price').userDS.username,
            language: sharedService.userSettings.get('currentLanguage')
        });
    },

    actions: {
        renewSubscription: function () {
            this._renewSubscription();
        }
    }
});
