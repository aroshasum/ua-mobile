import Ember from 'ember';

export default Ember.Component.extend({
    layoutName: 'components/tab-dropdown',
    currentActive: '',
    newActive: '',
    options: Ember.A(),

    initialize: function () {
        var that = this;
        var optionArray = this.get('displayList');
        this.set('options', optionArray);

        if (optionArray && optionArray.length > 0) {
            optionArray.forEach(function (element) {
                if (element) {
                    if (element.activeClass === 'active') {
                        that.set('newActive', element);
                    }

                    Ember.set(element, 'selectedDesc', element[that.get('labelKey')] ? element[that.get('labelKey')] :
                        element[that.get('valueKey')]);
                    Ember.set(element, 'tabTooltip', element[that.get('tabTooltipLabel')]);
                }
            });
        }
    }.on('init'),

    reload: function () {
        Ember.run.once(this, this.initialize);
    }.observes('displayList.@each'),

    languageChange: function () {
        Ember.run.once(this, this.initialize);
    }.observes('isDisplayListChanged'),

    setActive: function () {
        var arrOptions = this.get('displayList');

        if (!Ember.isEmpty(this.get('currentActive'))) {
            Ember.set(this.get('currentActive'), 'activeClass', '');
            this.set('value', null);
        }

        if (!Ember.isEmpty(this.get('newActive'))) {
            var newActive = arrOptions.findProperty(this.get('labelKey'), this.get('newActive')[this.get('labelKey')]);

            if (newActive) {
                Ember.set(newActive, 'activeClass', 'active');
                this.set('value', newActive[this.get('labelKey')]);
                this.set('currentActive', newActive);
                this.sendAction('actionName', newActive);
            }
        }
    }.observes('newActive').on('init'),

    actions: {
        clickAction: function (item) {
            this.set('newActive', item);
        }
    }
});
