import BaseController from '../../../base-controller';
import sharedService from '../../../../models/shared/shared-service';

export default BaseController.extend({
    stock: {},

    onPrepareData: function () {
        sharedService.getService('price').addSymbolRequest(this.get('exg'), this.get('sym'), this.get('inst'));
        this.set('stock', sharedService.getService('price').stockDS.getStock(this.get('exg'), this.get('sym'), this.get('inst')));
    },

    onClearData: function () {
        sharedService.getService('price').removeIndexRequest(this.get('exg'), this.get('sym'), this.get('inst'));
        this.set('stock', []);
    }
});
