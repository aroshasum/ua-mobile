import PersistentObject from '../../../models/shared/business-entities/persistent-object';

export default PersistentObject.extend({
    cacheKey: 'priceUserData'
    // This object contains user data shared across same type of widgets
    // Data key is dynamic and not pre-defined
}).create();
