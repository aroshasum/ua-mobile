import Ember from 'ember';

export default Ember.Component.extend({
    clickRowX: 0,
    clickRowY: 0,
    popupWidth: 0, // Width of the popup
    popupHeight: 0, // Height of the popup

    /* *
     * Render the popup or the drop-down list using the modal popup
     * @param controller
     * @param viewName
     * @param modal
     * @param container
     * @param isDropdown - true if drop-down list, false if popup
     */
    showPopup: function (controller, viewName, modal, container, isDropdown) {
        if (controller) {
            var route = this.container.lookup('route:application');

            route.render(viewName, {
                into: 'application',
                outlet: 'modalPopupContent',
                controller: controller
            });
        }

        modal.send('viewModal', viewName, container, isDropdown);
    }
});

