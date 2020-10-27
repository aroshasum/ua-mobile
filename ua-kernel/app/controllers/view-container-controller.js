import BaseController from './base-controller';
import sharedService from '../models/shared/shared-service';

// TODO [AROSHA] Extend this container to show any view in docked controller
export default BaseController.extend({
    stock: {},

    onPrepareData: function () {
        this.set('stock', sharedService.getService('price').stockDS.getStock(this.get('exg'), this.get('sym'), this.get('inst')));
    },

    onAddSubscription: function () {
        sharedService.getService('price').addSymbolRequest(this.get('exg'), this.get('sym'), this.get('inst'));
    },

    refreshWidget: function () {
        // TODO: [Bashitha] To be removed after symbol subscription moved to widget level
    }
});
