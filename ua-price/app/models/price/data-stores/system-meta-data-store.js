import Ember from 'ember';
import utils from '../../../utils/utils';
import DlsTimeZone from '../business-entities/day-light-saving';

export default Ember.Object.extend({
    store: {},
    typeMap: {DLS_TZ: DlsTimeZone},

    getSystemMetaDataByKey: function (type, key) {
        var store = this.get('store');
        var typeMap = this.get('typeMap');

        this._initType(store, type);

        if (!store[type][key]) {
            store[type][key] = typeMap[type].create();
        }

        return store[type][key];
    },

    getSystemMetaDataByType: function (type) {
        var store = this.get('store');
        this._initType(store, type);

        return store[type];
    },

    _initType: function (obj, type) {
        if (!obj[type]) {
            obj[type] = {};
        }
    }
});
