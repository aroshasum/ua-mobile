/* global Queue */
import utils from './utils';
import appConfig from '../config/app-config';

export default function () {
    this.analyticInterval = 30000; // 30 seconds - Sending analytics requests by this interval
    this.requestCountPerCycle = 5; // Sending this much of analytics requests per single iteration
    this.analyticQueue = new Queue();

    var that = this;

    var trackPage = function (page, title) {
        try {
            that.analyticQueue.enqueue({type: 'pageview', args: {'page': page, 'title': title}});
        } catch (e) {
            utils.logger.logError('Analytics Service track page error: ' + e);
        }
    };

    var trackEvent = function (category, action, label) {
        try {
            that.analyticQueue.enqueue({type: 'event', args: {category: category, action: action, label: label}});
        } catch (e) {
            utils.logger.logError('Analytics Service track event error: ' + e);
        }
    };

    var onAuthSuccess = function () {
        _initialize();
    };

    var _initialize = function () {
        try {
            _createService(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');
            window.ga('create', appConfig.googleAnalyticConfig.id, 'auto');

            setTimeout(function () {
                _sendAnalytics();
            }, that.analyticInterval);
        } catch (e) {
            utils.logger.logError('Google analytics creation failed: ' + e);
        }
    };

    var _createService = function (i, s, o, g, r, a, m) {
        // Code snippet provided by Google Analytics
        /*eslint-disable */
        try {
            i['GoogleAnalyticsObject'] = r;
            i[r] = i[r] || function () {
                    (i[r].q = i[r].q || []).push(arguments);
                };
            i[r].l = 1 * new Date();
            a = s.createElement(o);
            m = s.getElementsByTagName(o)[0];
            a.async = 1;
            a.src = g;
            m.parentNode.insertBefore(a, m);
        } catch (e) {
            utils.logger.logError('Google analytics initialization failed: ' + e);
        }
        /*eslint-enable */
    };

    var _sendAnalytics = function () {
        var sentCount = 0;

        while (sentCount <= that.requestCountPerCycle && that.analyticQueue.getLength() > 0) {
            var trackMsg = that.analyticQueue.dequeue();
            sentCount++;

            switch (trackMsg.type) {
                case 'pageview':
                    if (window.ga) {
                        window.ga('send', 'pageview', {'page': trackMsg.args.page, 'title': trackMsg.args.title});
                    }

                    break;

                case 'event':
                    if (window.ga) {
                        window.ga('send', 'event', trackMsg.args.category, trackMsg.args.action, trackMsg.args.label);
                    }

                    break;

                default:
                    break;
            }
        }

        setTimeout(function () {
            _sendAnalytics();
        }, that.analyticInterval);
    };

    return {
        onAuthSuccess: onAuthSuccess,
        trackPage: trackPage,
        trackEvent: trackEvent
    };
}
