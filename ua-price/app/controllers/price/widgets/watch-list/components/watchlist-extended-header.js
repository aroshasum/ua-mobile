import Ember from 'ember';

export default Ember.Component.extend({
    layoutName: 'price/widgets/watch-list/components/watchlist-extended-header',
    isDefaultExchangeSelected: false,
    isExchangeSelected: false,

    initializeWlHeader: function () {
        var that = this;

        var currentTime = new Date().getTime();
        this.set('key', 'wl-header-' + currentTime);

        Ember.run.scheduleOnce('afterRender', this, function () {
            var controller = that.get('targetController');

            if (controller) {
                that.onExchangeUpdate();
                controller.set('wlHeader', this);
            }
        });
    }.on('init'),

    defaultExchange: function () {
        return this.get('targetController.defaultExchange');
    }.property('targetController.defaultExchange'),

    customWatchListArray: function () {
        return this.get('targetController.customWatchListArray');
    }.property('targetController.customWatchListArray'),

    changeCustomWLActive: function () {
        var controller = this.get('targetController');
        this.set('customWLNewActive', controller.get('customWLNewActive'));
    }.observes('targetController.customWLNewActive'),

    setDefaultExgActive: function () {
        var controller = this.get('targetController');
        this.set('isDefaultExchangeSelected', controller.get('isDefaultExchangeSelected'));
    }.observes('targetController.isDefaultExchangeSelected'),

    changeCustomWLDropdown: function () {
        var controller = this.get('targetController');
        this.set('isCurrentWLDropdown', controller.get('isCurrentWLDropdown'));
    }.observes('targetController.isCurrentWLDropdown'),

    languageChange: function () {
        var controller = this.get('targetController');
        this.set('isCustomWLChanged', controller.get('isCustomWLChanged'));
    }.observes('targetController.isCustomWLChanged'),

    onUnloadWlHeader: function () {
        this.set('selectedExchange', undefined);
        this.set('isDefaultExchange', undefined);
    },

    onExchangeUpdate: function () {
        var controller = this.get('targetController');

        if (controller) {
            this.set('selectedExchange', controller.get('selectedExchange'));
            this.set('isDefaultExchange', controller.get('isDefault'));
            this.set('isDefaultExchangeSelected', true);
        }
    },

    onResize: function () {
        var controller = this.get('targetController');

        if (controller.responsive) {
            var responsiveHandler = controller.responsive;

            // Call onResize when exchanges are changed
            Ember.run.later(responsiveHandler, responsiveHandler.onResize, 2000);
        }
    },

    actions: {
        setWlExchange: function (exchg) {
            var controller = this.get('targetController');

            if (exchg) {
                controller.refreshWidget({exg: exchg.code ? exchg.code : exchg.exg});
            }

            if (!controller.get('isDefault')) {
                this.set('selectedExchange', controller.get('selectedExchange'));
                this.set('isDefaultExchangeSelected', false);
                this.set('isExchangeSelected', true);
            } else {
                this.set('isDefaultExchangeSelected', true);
                this.set('isExchangeSelected', false);
            }

            controller.set('wlHeader', this);
            this.onResize();
        },

        onCustomWlSelect: function (option) {
            this.get('targetController').onCustomWlSelect(option.id);
            this.set('isDefaultExchangeSelected', false);
            this.set('isExchangeSelected', false);
        }
    }
});

