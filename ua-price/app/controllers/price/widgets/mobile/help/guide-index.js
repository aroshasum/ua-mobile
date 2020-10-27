import BaseController from '../../../../base-controller';
import sharedService from '../../../../../models/shared/shared-service';
import controllerFactory from '../../../../controller-factory';

export default BaseController.extend({
    title: '',

    onLoadWidget: function () {
        this.set('title', this.get('app').lang.labels.help);
    },

    isArabic: function () {
        return sharedService.userSettings.currentLanguage === 'AR';
    }.property('sharedService.userSettings.currentLanguage'),

    actions: {
        invokeWidget: function (widgetName) {
            var widgetController = controllerFactory.createController(this.container, 'controller:price/widgets/mobile/help/' + widgetName);
            var viewName = 'price/widgets/mobile/help/' + widgetName;

            widgetController.initializeWidget({wn: 'help'});
            sharedService.getService('priceUI').showChildView(viewName, widgetController, widgetController.get('title'), 'help-' + widgetName);
        }
    }
});