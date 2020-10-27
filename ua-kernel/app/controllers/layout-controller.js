import Ember from 'ember';
import sharedService from '../models/shared/shared-service';

export default (function () {
    var loadLayout = function (rowCount, colCount, customLayout, widgetContainer) {
        sharedService.userState.customWsRowCount = rowCount;
        sharedService.userState.customWsColCount = colCount;
        sharedService.userState.save();

        _loadWorkspaceContent(customLayout, widgetContainer);
    };

    var loadWorkspace = function (workspace, customLayout, widgetContainer) {
        sharedService.userState.customWS = workspace;
        sharedService.userState.save();

        _loadWorkspaceContent(customLayout, widgetContainer);
    };

    var _loadWorkspaceContent = function (customLayout, widgetContainer) {
        var route = customLayout.container.lookup('route:application');

        route.render('custom-workspace.custom-layout-view', {
            into: 'custom-workspace.custom-layout',
            outlet: 'custom-outlet',
            controller: customLayout
        });

        Ember.run.later(function () {
            var gridDiv = Ember.$('.grid-stack');
            var options = {
                /*eslint-disable */
                cell_height: 5, // Set unit cell height
                vertical_margin: 5, // Vertical gap between rows
                /*eslint-enable */
                resizable: {
                    handles: 'se' // Resizing is available in these direction
                }
            };

            if (!gridDiv.data('gridstack')) {
                gridDiv.gridstack(options);

                gridDiv.on('change', function () {
                    widgetContainer.saveWorkspace();
                });
            }
        }, 100);
    };

    return {
        loadLayout: loadLayout,
        loadWorkspace: loadWorkspace
    };
})();
