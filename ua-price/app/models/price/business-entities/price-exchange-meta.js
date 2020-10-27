import Ember from 'ember';
import PersistentObject from '../../../models/shared/business-entities/persistent-object';
import utils from '../../../utils/utils';

export default PersistentObject.extend({
    // RT = 308
    cacheKey: 'priceExchangeMeta',
    isCompress: true,
    exgMetaData: undefined,

    getExgSummaryObj: function () {
        if (Ember.$.isEmptyObject(this.get('exgMetaData'))) {
            this.set('exgMetaData', {HED: {}, DAT: {}, VRS: {}});
        }

        return this.get('exgMetaData');
    },

    setData: function (userParams) {
        if (userParams) {
            this._super(userParams);
        } else {
            this.set('exgMetaData', {HED: {}, DAT: {}, VRS: {}});
        }
    },

    save: function (language) {
        this._super(utils.Constants.StorageType.Local, undefined, language);
    },

    load: function (language) {
        return this._super(utils.Constants.StorageType.Local, language);
    },

    getPersistentData: function () {
        return {exgMetaData: this.get('exgMetaData')};
    }
}).create();
