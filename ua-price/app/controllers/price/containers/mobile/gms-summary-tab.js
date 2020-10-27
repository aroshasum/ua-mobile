import Ember from 'ember';
import BaseController from '../../../base-controller';
import MarketStatusPanel from '../../widgets/mobile/market-summary/components/market-status-panel';

export default BaseController.extend({

});

Ember.Handlebars.helper('market-status-panel', MarketStatusPanel);
