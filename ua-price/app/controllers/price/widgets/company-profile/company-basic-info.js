import Ember from 'ember';
import sharedService from '../../../../models/shared/shared-service';
import BaseArrayController from '../../../base-array-controller';
import appEvents from '../../../../app-events';

export default BaseArrayController.extend({
    dimensions: {
        w: 6,
        h: 30
    },

    basicInfo: {},
    priceService: sharedService.getService('price'),

    onLoadWidget: function () {
        this.setErrorMessage();
        appEvents.subscribeSymbolChanged(this.get('wkey'), this, this.get('selectedLink'));
    },

    onAfterRender: function () {
        Ember.$('.nano').nanoScroller();
    },

    onPrepareData: function () {
        var that = this;

        this.startLoadingProgress();

        var basicInfo = this.priceService.companyProfileDS.getCompanyProfile(this.get('exg'), this.get('sym'),
            sharedService.userSettings.currentLanguage,

            function () {
                that.onDataSuccess();
            },

            function () {
                that.onDataError();
            });

        this.set('basicInfo', basicInfo);
        this.set('symbolObj', this.priceService.stockDS.getStock(this.get('exg'), this.get('sym')));
        this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.show, ['sym:', this.get('sym'), '~', this.get('exg')].join(''));

        // Binding the scrollbar after the data is available and rendering the view
        Ember.$('.nano').nanoScroller();
    },

    onClearData: function () {
        this.set('basicInfo', null);
    },

    onUnloadWidget: function () {
        appEvents.unSubscribeSymbolChanged(this.get('wkey'), this.get('selectedLink'));
    },

    onCheckDataAvailability: function () {
        var companyProfObj = this.priceService.companyProfileDS.checkCompProfDataAvailability(this.get('exg'), this.get('sym'),
            sharedService.userSettings.currentLanguage);

        if (companyProfObj) {
            return this.utils.validators.isAvailable(companyProfObj.compID);
        }

        return false;
    },

    image: function () {
        if (this.utils.validators.isAvailable(this.get('basicInfo.logo'))) {
            return this.utils.imageHelper.getImage(this.get('basicInfo.logo'));
        }
    }.property('basicInfo.logo'),

    formattedAddress: function () {
        var str = this.get('basicInfo.addr');

        if (this.utils.validators.isAvailable(str)) {
            return str.split(', ');// TODO: [Thilina] need to use trim
        }
    }.property('basicInfo.addr'),

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