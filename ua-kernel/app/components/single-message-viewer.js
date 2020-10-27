import Ember from 'ember';
import utils from '../utils/utils';
import appConfig from '../config/app-config';

export default Ember.Component.extend({
    layoutName: 'components/single-message-viewer',

    showMessage: false,
    message: '',
    type: '',
    icon: '',
    backgroundCss: '',
    messageCss: '',

    isTablet: appConfig.customisation.isTablet,

    setMessageType: function () {
        var messageType = this.get('type');
        var iconCss = '';

        switch (messageType) {
            case utils.Constants.MessageTypes.Error:
                iconCss = 'fa fa-close appttl-down-fore-color';
                break;

            case utils.Constants.MessageTypes.Info:
                iconCss = 'fa fa-info news-icon-color';
                break;

            case utils.Constants.MessageTypes.Success:
                iconCss = 'fa fa-check appttl-up-fore-color';
                break;
        }

        this.set('icon', iconCss);
    }.observes('type'),

    isMobile: function () {
        return appConfig.customisation.isMobile;
    }.property()
});
