import ModalPopup from './modal-popup';

export default ModalPopup.extend({
    layoutName: 'components/data-loading-indicator',

    expose: function () {
        var parentController = this.get('targetObject');
        var exposedName = this.get('id');

        if (!exposedName) {
            exposedName = 'loading-' + parentController.get('wkey');
        }

        parentController.set(exposedName, this);
    }.on('didInsertElement')
});