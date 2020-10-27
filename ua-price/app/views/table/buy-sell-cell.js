import Ember from 'ember';
import Cell from './cell';
import appConfig from '../../config/app-config';
import LanguageDataStore from '../../models/shared/language/language-data-store';

export default Cell.extend({
    templateName: 'table/views/buy-sell-cell',
    app: LanguageDataStore.getLanguageObj(),

    cellValue: Ember.computed(function () {
        var receivedValue = this.get('cellContent') ? this.get('cellContent').firstValue : undefined;
        var shownValue = '--';

        if (receivedValue === 'B') {
            shownValue = this.get('app').lang.labels.buy;
        } else if (receivedValue === 'S') {
            shownValue = this.get('app').lang.labels.sell;
        }

        return shownValue;
    }).property('cellContent'),

    getPositiveNegativeStyle: function () {
        var positiveStyle = appConfig.customisation.isMobile ? 'up-fore-color font-xxx-l' : 'up-fore-color';
        var negativeStyle = appConfig.customisation.isMobile ? 'down-fore-color font-xxx-l' : 'down-fore-color';
        var value = this.get('cellContent') ? this.get('cellContent').firstValue : undefined;

        return value === 'B' ? positiveStyle : negativeStyle;
    }
});
