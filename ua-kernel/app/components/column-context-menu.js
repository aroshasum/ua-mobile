import Ember from 'ember';
import utils from '../utils/utils';
import BasePopup from './base-popup';

export default BasePopup.extend({
    layoutName: 'components/column-context-menu',
    filterText: null,
    shownColumns: Ember.computed.oneWay('columns'),

    checkFilterMatch: function checkFilterMatch(columnName, filterText) {
        var isMatchedTextFilter = true;

        if (utils.validators.isAvailable(filterText)) {
            var columnWords = columnName.split(utils.Constants.StringConst.Space);
            isMatchedTextFilter = false;

            Ember.$.each(columnWords, function (index, word) {
                if (word.slice(0, filterText.length).toLowerCase() === filterText.toLowerCase()) {
                    isMatchedTextFilter = true;
                    return false;
                }
            });
        }

        return isMatchedTextFilter;
    },

    filterStocks: (function () {
        var filterText = this.get('filterText');

        var filteredColumns = this.get('columns').filter((function (that) {    //eslint-disable-line
            return function (column) {
                return that.checkFilterMatch(column.displayName, filterText);
            };
        })(this));

        this.set('shownColumns', filteredColumns);        // Need to capture filter removing event to avoid 'set' without filters
    }).observes('filterText'),

    click: function (event) {
        var target = Ember.$(event.target);

        if (!target.hasClass('btn')) {
            event.stopPropagation();
        }
    },

    actions: {
        save: function () {
            this.sendAction('saveAction');
        },

        cancel: function () {
            this.sendAction('cancelAction');
        }
    }
});
