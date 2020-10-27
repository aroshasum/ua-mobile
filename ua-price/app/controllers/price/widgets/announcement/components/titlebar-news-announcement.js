import Ember from 'ember';
import sharedService from '../../../../../models/shared/shared-service';
import utils from '../../../../../utils/utils';

export default Ember.Component.extend({
    layoutName: 'price/widgets/announcement/components/titlebar-news-announcement',
    annObj: {},
    annNewsArr: {},
    newAnnNewsDuration: 10000,
    latestNewsHeader: '',

    initialize: function () {
        this.set('annNewsArr', this.priceService.announcementDS.annNewsStoreArray);
        this.set('type', utils.Constants.MessageTypes.Info);
    },

    displayNews: function () {
        var that = this;

        Ember.run.once(function () {
            var sortedAnnNewsArr = that.get('annNewsArr').sortBy('dDt');
            var latestNews = sortedAnnNewsArr[sortedAnnNewsArr.length - 1];

            if (latestNews && that.get('latestNewsHeader') !== latestNews.get('dHed')) {
                that.set('annObj', latestNews);
                var titleBar = sharedService.getService('sharedUI').getService('titleBar');

                if (titleBar && titleBar.renderNotificationTemplate) {
                    titleBar.renderNotificationTemplate(that.layoutName, that);
                }

                Ember.run.later(that, function () {
                    if (titleBar && titleBar.hideNotificationTemplate) {
                        titleBar.hideNotificationTemplate(that.layoutName, that);
                    }
                }, that.get('newAnnNewsDuration'));

                that.set('latestNewsHeader', latestNews.get('dHed'));
            }
        });
    }.observes('annNewsArr.@each.dHed')
});