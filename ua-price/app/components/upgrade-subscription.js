import Ember from 'ember';
import sharedService from '../models/shared/shared-service';
import appConfig from '../config/app-config';
import utils from '../utils/utils';

export default Ember.Component.extend({
    isDelayedUserLogged: sharedService.getService('sharedUI').isDelayedUserLogged,
    _upgradeSubscription: function () {
        window.open(this._generateUpgradeUrl(), '_blank');
    },

    _generateUpgradeUrl: function () {
        return utils.requestHelper.generateQueryString(appConfig.subscriptionConfig.upgradeSubscriptionPath, {
            user: sharedService.getService('price').userDS.username,
            language: sharedService.userSettings.get('currentLanguage')
        });
    },

    actions: {
        upgradeSubscription: function () {
            this._upgradeSubscription();
        }
    }
});
