import TableCell from 'ember-table/views/table-cell';
import blinkMixin from '../table-mixins/blink-mixin';
import conditionMixin from '../table-mixins/condition-mixin';
import formatterMixin from '../table-mixins/formatter-mixin';
import styleMixin from '../table-mixins/style-mixin';
import languageDataStore from '../../../models/shared/language/language-data-store';
import appConfig from '../../../config/app-config';

export default TableCell.extend(blinkMixin, conditionMixin, formatterMixin, styleMixin, {
    templateName: 'table/views/dual-cell',
    isMobile: appConfig.customisation.isMobile,
    isTablet: appConfig.customisation.isTablet,

    initializeCell: function () {
        this.set('app', languageDataStore.getLanguageObj());
    }.on('didInsertElement'),

    firstValue: function () {
        return this.get('cellContent') ? this.get('cellContent').firstValue : undefined;
    }.property('cellContent'),

    columnId: function () {
        return this.get('column.contentPath');
    }.property(),

    secondValue: function () {
        return this.get('cellContent') ? this.get('cellContent').secondValue : undefined;
    }.property('cellContent')
});

