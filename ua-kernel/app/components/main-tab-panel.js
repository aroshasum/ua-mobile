import Ember from 'ember';

export default Ember.Component.extend({
    layoutName: 'components/main-tab-panel',

    actions: {
        clickTabItem: function (tabItem) {
            this.sendAction('tabClickAction', tabItem);
        }
    }
});
