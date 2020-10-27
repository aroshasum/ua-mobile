import Ember from 'ember';
import BaseController from '../../../base-controller';
import sharedService from '../../../../models/shared/shared-service';
import QuoteStatusPanel from './quote-summary/components/quote-status-panel';

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

Ember.Handlebars.helper('quote-status-panel', QuoteStatusPanel);