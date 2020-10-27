import PriceUIModuleInitializer from '../../../../controllers/price/initializers/price-ui-module-initializer';
import PriceUIServiceMobile from '../../../../controllers/price/price-ui-service-mobile';

export default PriceUIModuleInitializer.extend({
    createService: function () {
        return PriceUIServiceMobile.create();
    }
});