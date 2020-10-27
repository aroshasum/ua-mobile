import Ember from 'ember';
import SharedUIModuleInitializer from '../../../../controllers/shared/initializers/shared-ui-module-initializer';
import SharedUIServiceMobile from '../../shared-ui-service-mobile';

export default SharedUIModuleInitializer.extend({
    preInitialize: function () {
        // This is added to show login view in preInitialize in mobile
        Ember.$('div.login.pos-abs').removeClass('display-none');

        this._super();
    },

    createService: function () {
        return SharedUIServiceMobile.create();
    }
});