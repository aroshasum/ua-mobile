import Ember from 'ember';
import utils from '../../../utils/utils';
import sharedService from '../../../models/shared/shared-service';
import languageDataStore from '../../../models/shared/language/language-data-store';

export default Ember.Object.extend({
    lanKey: '',
    valueObj: null,
    noOfDecimals: '',
    dataField: '',
    fieldObj: '',
    value: '',
    app: languageDataStore.getLanguageObj(),

    onInit: function () {
        this.set('dataField', this.get('fieldObj').dataField);
        this.set('noValue', sharedService.userSettings.displayFormat.noValue);

        this.generateCaption();
        this.generateStyle();
        this.generateContainerStyle();
        this.generateFormattedValue();
    }.on('init'),

    generateCaption: function () {
        var that = this;

        Ember.defineProperty(this, 'caption', Ember.computed('app.lang',
            function () {
                return (that.get('app').lang.labels[that.get('fieldObj').lanKey] ? that.get('app').lang.labels[that.get('fieldObj').lanKey] : that.get('fieldObj').lanKey);
            }));
    },

    generateContainerStyle: function () {
        var that = this;
        var field = this.get('dataField');

        Ember.defineProperty(this, 'containerStyle', Ember.computed('valueObj.' + field,
            function () {
                return that.get('fieldObj').containerStyle;
            }));
    },

    generateStyle: function () {
        var that = this;
        var field = this.get('dataField');

        Ember.defineProperty(this, 'style', Ember.computed('valueObj.' + field,
            function () {
                var dataField = that.get('dataField');
                var value = that.get('valueObj').get(dataField);

                if (that.get('fieldObj').isCustomStyle) {
                    return ([that.get('fieldObj').lanKeyAppend, that.get('valueObj').get(dataField)].join('_'));
                } else if (that.get('fieldObj').isValueBaseCss) {
                    var css = 'fore-color';

                    if (value < 0) {
                        css = 'down-fore-color';
                    } else if (value > 0) {
                        css = 'up-fore-color';
                    }

                    return css;
                } else {
                    return that.get('fieldObj').style;
                }
            }));
    },

    generateFormattedValue: function () {
        var that = this;
        var field = this.get('dataField');

        Ember.defineProperty(this, 'formattedValue', Ember.computed('valueObj.' + field,
            function () {
                var dataField = that.get('dataField');
                var valueObj = that.get('valueObj');

                if (!Ember.$.isEmptyObject(valueObj)) {
                    var formattedValue = '';
                    var exg = valueObj.exg;
                    var value = valueObj.get(dataField);

                    if (that.get('fieldObj').lanKeyAppend) {
                        formattedValue = that.get('app').lang.labels[[that.get('fieldObj').lanKeyAppend, value].join('_')];
                    } else if (that.get('fieldObj').isAssetType) {
                        formattedValue = that.get('app').lang.labels[utils.AssetTypes.InstrumentLangKeys[value]];
                    } else {
                        formattedValue = value;
                    }

                    if (utils.validators.isAvailable(formattedValue) && formattedValue !== -1) {
                        switch (that.get('fieldObj.formatter')) {
                            case utils.Constants.DataFormatter.Currency:
                                return utils.formatters.formatNumber(formattedValue, this.noOfDecimals);

                            case utils.Constants.DataFormatter.Long:
                                return utils.formatters.formatNumber(formattedValue, 0);

                            case utils.Constants.DataFormatter.Integer:
                                return utils.formatters.formatNumber(formattedValue, 0);

                            case utils.Constants.DataFormatter.Date:
                                return formattedValue ? utils.formatters.formatToDate(formattedValue) : sharedService.userSettings.displayFormat.noValue;

                            case utils.Constants.DataFormatter.Percentage:
                                return utils.formatters.formatNumberPercentage(formattedValue);

                            case utils.Constants.DataFormatter.DivideNumber:
                                return utils.formatters.divideNumber(formattedValue, this.noOfDecimals);

                            case utils.Constants.DataFormatter.Time:
                                return formattedValue ? utils.formatters.formatToTime(formattedValue, exg) : sharedService.userSettings.displayFormat.noValue;

                            case utils.Constants.DataFormatter.DateTime:
                                return formattedValue ? utils.formatters.formatToDateTime(formattedValue) : sharedService.userSettings.displayFormat.noValue;

                            default:
                                return formattedValue;
                        }
                    } else {
                        return that.get('noValue');
                    }
                } else {
                    return that.get('noValue');
                }
            }));
    }
});