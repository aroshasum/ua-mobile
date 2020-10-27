import Ember from 'ember';

export default Ember.ContainerView.extend({
    style: function () {
        return 'position: absolute; height: 1px; max-height: 1px;';
    },

    load: function () {
        // Need to find a better way
        Ember.PopupContainerView = this;
    }.on('init'),

    addPopupView: function (item) {
       // Ember.Logger.log('UBTEMP : BEFORE Push Object: ' + this.get('target'));
        this.pushObject(item);
      //  Ember.Logger.log('UBTEMP : AFTER Push Object ' + this.get('target'));
    }
});