import Ember from 'ember';
import Alert from '../business-entities/alert';
import utils from '../../../utils/utils';

export default Ember.Object.extend({
    subscriptionKey: 'alertDS',
    store: {},
    alertArray: Ember.A(),
    alertMapBySymExg: {},
    alertToggle: true,

    getAlert: function (token, exg) {
        var key = token;
        var currentStore = this.get('store');
        var currentAlert = currentStore[key];

        if (!currentAlert) {
            currentAlert = Alert.create({
                token: token,
                exg: exg
            });

            currentStore[key] = currentAlert;
            this.addToOtherCollections(currentAlert);
        }

        return currentAlert;
    },

    getAlertsBySymbol: function (exg, sym) {
        return this._getSymbolArray(exg, sym);
    },

    getAllAlerts: function () {
        return this.get('alertArray');
    },

    addToOtherCollections: function (currentAlert) {
        this.get('alertArray').pushObject(currentAlert);
        this._getSymbolArray(currentAlert.exg, currentAlert.sym).pushObject(currentAlert);
    },

    alertUpdateRecieved: function () {
        this.toggleProperty('alertToggle');
    },

    removeAlertFromCollections: function (alertToken) {
        var currentStore = this.get('store');
        var currentAlert = currentStore[alertToken];
        var symArray = this._getSymbolArray(currentAlert.exg, currentAlert.sym);

        if (symArray) {
            this._removeItemFromArray(alertToken, symArray);
        }

        currentStore[alertToken] = undefined;

        // Remove alert from alertArray
        var alertArray = this.get('alertArray');
        this._removeItemFromArray(alertToken, alertArray);
    },

    getAlertMapKey: function (exchange, symbol) {
        return utils.keyGenerator.getKey(exchange, symbol);
    },

    _removeItemFromArray: function (token, alertArray) {
        var alertIndex;
        var array = alertArray;

        Ember.$.each(array, function (index, item) {
            if (item.token === token) {
                alertIndex = index;

                return false;
            }
        });

        if (alertIndex || alertIndex === 0) {
            array.removeAt(alertIndex);
        }
    },

    _getSymbolArray: function (exchange, symbol) {
        var key = this.getAlertMapKey(exchange, symbol);
        var alertMapBySymExg = this.get('alertMapBySymExg');

        if (!alertMapBySymExg[key]) {
            alertMapBySymExg[key] = Ember.A();
        }

        return alertMapBySymExg[key];
    }
});
