export default (function () {
    // Stores prototypes for the requested controllers
    var controllerConstructors = {};
    var singletonControllers = {};

    /* *
     * Returns an instance of the controller for the given widget template
     * If controller prototype is not requested earlier, creates one by router.controllerFor and returns
     * If controller prototype is already available, returns a new instance of the requested controller
     * Reference: http://stackoverflow.com/questions/27971548/access-parent-constructor-in-ember-js-object
     * Reference: http://stackoverflow.com/questions/15705411/multiple-instances-of-the-same-controller-simultaneously-in-ember
     * @param container Ember container
     * @param widgetName Type + Name of the widget template
     * @param isSingleton True if needs singleton instance
     * @returns {*} Instance of the widget template
     */
    var createController = function (container, widgetName, isSingleton) {
        var controller;

        if (isSingleton) {
            var widgetControllerInst = singletonControllers[widgetName];

            if (widgetControllerInst) {
                return widgetControllerInst;
            }
        }

        if (!controllerConstructors[widgetName]) {
            controller = container.lookupFactory(widgetName).create(); // Instantiate a controller instance for the first time
            controllerConstructors[widgetName] = controller.constructor; // Stores the prototype to serve later requests
        } else {
            controller = controllerConstructors[widgetName].create(); // Creates a new instance from the stored prototype
        }

        singletonControllers[widgetName] = controller; // TODO [Arosha] Get controller from container.lookup instead of storing here

        return controller;
    };

    return {
        createController: createController
    };
})();
