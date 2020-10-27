import PersistentObject from '../../../models/shared/business-entities/persistent-object';
import utils from '../../../utils/utils';

export default PersistentObject.extend({
    cacheKey: 'windowState',
    windowIds: [],

    save: function () {
       this._super(utils.Constants.StorageType.Local);
    },

    load: function () {
        return this._super(utils.Constants.StorageType.Local);
    },

    getPersistentData: function () {
        return {windowIds: this.get('windowIds')};
    }

}).create();