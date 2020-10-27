import Ember from 'ember';
import PriceConstant from '../price-constants';
import utils from '../../../utils/utils';

export default Ember.Object.extend({
    id: '',                // Announcement id - Unique identifier
    exg: '',               // Exchange or news provider
    sym: '',               // Symbol
    ln: '',                // Language
    hed: '',               // Header
    bod: '',               // Body
    ref: '',               // Reference Code
    type: PriceConstant.ResponseType.Data.ResponseAnnouncement,    // 11 - Announcement, 77 - News, ?? - Calendar Event
    isRead: false,         // Read or not
    dt: '',                // Date Time
    dSymExg: '',           // Display Symbol (dSym) or Exchange (de)

    dHed: function () {
        return utils.formatters.convertUnicodeToNativeString(this.get('hed'));
    }.property('hed'),     // Display Header

    dBody: function () {
        return utils.formatters.convertUnicodeToNativeString(this.get('bod'));
    }.property('bod'),     // Display Body

    dDt: function () {
        var dateTime = this.get('dt');

        return utils.formatters.formatToDateTimeMinute(dateTime);
    }.property('dt'),      // Display date Time

    isAnnouncement: function () {
        return (this.type === PriceConstant.ResponseType.Data.ResponseAnnouncement);
    }.property('type'),

    isNews: function () {
        return (this.type === PriceConstant.ResponseType.Data.ResponseNews);
    }.property('type'),

    isBodyUpdated: function () {
        return utils.validators.isAvailable(this.bod);
    }.property('bod'),

    isArabic: function () {
        return (this.get('ln') === 'AR');
    }.property('ln'),

    dateObj: function () {
        var dateTime = this.get('dt');
        return utils.formatters.convertStringToDate(dateTime);
    }.property('dt'),

    setData: function (announcementMessage) {
        var that = this;

        Ember.$.each(announcementMessage, function (key, value) {
            that.set(key, value);
        });
    }
});

