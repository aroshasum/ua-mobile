import PersistentObject from '../../../models/shared/business-entities/persistent-object';
import utils from '../../../utils/utils';

export default PersistentObject.extend({
    // RT = 303
    cacheKey: 'priceSymbolMeta',
    isCompress: true,
    metaData: {},

    getExgMetaObj: function (exchange) {
        var exgObj = this.get('metaData')[exchange];

        if (!exgObj) {
            exgObj = {DAT: {TD: {}, VRS: [0]}, HED: {TD: {}}};
            this.metaData[exchange] = exgObj;
        }

        return exgObj;
    },

    setData: function (userParams) {
        if (userParams) {
            this._super(userParams);
        } else {
            this.set('metaData', {});
        }
    },

    save: function (language) {
        this._super(utils.Constants.StorageType.Local, undefined, language);
    },

    load: function (language) {
        return this._super(utils.Constants.StorageType.Local, language);
    },

    getPersistentData: function () {
        return {metaData: this.get('metaData')};
    }
}).create();
