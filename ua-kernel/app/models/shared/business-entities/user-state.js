import Ember from 'ember';
import PersistentObject from '../../../models/shared/business-entities/persistent-object';
import utils from '../../../utils/utils';

export default PersistentObject.extend({
    cacheKey: 'userState',

    lastMenu: undefined,
    lastTab: undefined,
    lastArgs: undefined,
    lastInnerWidget: undefined,
    defaultWS: undefined,
    globalWidgetConfig: undefined,
    customWS: undefined,
    customWsRowCount: 1,
    customWsColCount: 1,
    recentExgs: [],
    globalArgs: {},
    financialPrimarySym: undefined,
    financialSecondarySym: undefined,

    save: function () {
        this._super(utils.Constants.StorageType.Local, undefined, this._getWindowId());
    },

    load: function () {
        return this._super(utils.Constants.StorageType.Local, undefined, this._getWindowId());
    },

    remove: function (windowId) {
       return this._super(utils.Constants.StorageType.Local, undefined, windowId);
    },

    _getWindowId: function () {
        var windowId = '*';

        if (Ember.appGlobal.multiScreen && !Ember.appGlobal.multiScreen.isParentWindow) {
            windowId = Ember.appGlobal.queryParams[utils.Constants.EmbeddedModeParams.ChildWindowId];
        }

        return windowId;
    },

    getWidgetState: function (prop) {
        var stateObj;

        if (this.get('globalWidgetConfig')) {
            stateObj = this.get('globalWidgetConfig')[prop];
        }

        return stateObj;
    }
}).create();
