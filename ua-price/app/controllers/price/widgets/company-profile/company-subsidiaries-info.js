import sharedService from '../../../../models/shared/shared-service';
import BaseArrayController from '../../../base-array-controller';
import appEvents from '../../../../app-events';

export default BaseArrayController.extend({
    dimensions: {
        w: 3,
        h: 36
    },

    model: [],

    // Parameters for sorting
    sortProperties: ['subsiSherPrs'],
    sortAscending: false,

    priceService: sharedService.getService('price'),

    onLoadWidget: function () {
        this.setErrorMessage();
        appEvents.subscribeSymbolChanged(this.get('wkey'), this, this.get('selectedLink'));
    },

    onAfterRender: function () {
        this.generateScrollBar(undefined, 2000);
    },

    onPrepareData: function () {
        var that = this;

        this.startLoadingProgress();

        var subsInfo = this.priceService.companyProfileDS.getCompanyProfile(this.get('exg'), this.get('sym'),
            sharedService.userSettings.currentLanguage,

            function () {
                that.onDataSuccess();
            },

            function () {
                that.onDataError();
            }).compSubsidiaries;

        this.set('model', subsInfo);
        this.set('symbolObj', this.priceService.stockDS.getStock(this.get('exg'), this.get('sym')));
        this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.show, ['sym:', this.get('sym'), '~', this.get('exg')].join(''));

        // Binding the scrollbar after the data is available and rendering the view
        // Ember.$('.nano').nanoScroller();
    },

    onClearData: function () {
        this.set('model', null);
    },

    onUnloadWidget: function () {
        appEvents.unSubscribeSymbolChanged(this.get('wkey'), this.get('selectedLink'));
    },

    onCheckDataAvailability: function () {
        var companyProfObj = this.priceService.companyProfileDS.checkCompProfDataAvailability(this.get('exg'), this.get('sym'),
            sharedService.userSettings.currentLanguage);

        return companyProfObj && companyProfObj.compSubsidiaries && companyProfObj.compSubsidiaries.length > 0;
    },

    sortedContent: function () {
        return this.get('arrangedContent');
    }.property('arrangedContent'),

    onLanguageChanged: function () {
        this.onPrepareData();
        this.setErrorMessage();
    },

    actions: {
        setLink: function (option) {
            this.setWidgetLink(option);
        }
    }
});