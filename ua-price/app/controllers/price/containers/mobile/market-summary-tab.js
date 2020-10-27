import Ember from 'ember';
import BaseController from '../../../base-controller';
import MarketStatusPanel from '../../widgets/mobile/market-summary/components/market-status-panel';
import QuoteStatusPanel from '../../widgets/mobile/quote-summary/components/quote-status-panel';

export default BaseController.extend({

});

Ember.Handlebars.helper('market-status-panel', MarketStatusPanel);
Ember.Handlebars.helper('quote-status-panel', QuoteStatusPanel);