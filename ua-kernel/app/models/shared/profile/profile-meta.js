import PersistentObject from '../../../models/shared/business-entities/persistent-object';

export default PersistentObject.extend({
    cacheKey: 'profileMeta',

    id: '',
    version: '',
    panels: ''
}).create();