import Ember from 'ember';
import sharedService from '../../models/shared/shared-service';
import templateGenerator from '../../controllers/custom-workspace/template-generator';
import utils from '../../utils/utils';
import priceWidgetConfig from '../../config/price-widget-config';

export default Ember.View.extend({
    widgetList: priceWidgetConfig.WidgetList,
    hGap: 5, // Horizontal gap
    cellHeight: 5, // Set unit cell height
    amountOfCols: 12, // Amount of columns provided by grid stack framework
    maximumWidgetCount: 10, // Maximum allowed widget count

    loadTemplate: function () {
        var controller = this.get('controller.targetController');

        if (controller) {
            var htmlArray = ['<div class="grid-stack">'];
            var viewHeight = Ember.$(window).height(); // Height of the view port
            var workspace = controller.getCustomWorkSpace(sharedService.userState.customWS);

            if (workspace.length > 0) {
                // If condition executes all the time except initial layout selection
                htmlArray = this.generateWorkspaceHtml(htmlArray, controller, workspace);
            } else if (controller.get('complexLayoutContent')) {
                var complexLayoutContent = controller.get('complexLayoutContent');
                var complexWidgetCount = complexLayoutContent.widgetCount;

                var heightArray = this.calculateHeight(viewHeight, complexLayoutContent.rowCounts, complexWidgetCount);
                var coordinatesArray = this.calculateComplexCoordinates(complexLayoutContent.coordinates, complexLayoutContent.yCoordinates, heightArray);
                var extraCoordinatesArray = this.calculateExtraCoordinates(complexWidgetCount, 2, 2, 48); // TODO [Atheesan]: Need to calculate values dynamically

                htmlArray = this.generateComplexLayoutHtml(htmlArray, controller, coordinatesArray, extraCoordinatesArray, heightArray, complexLayoutContent.widths, complexWidgetCount);
            } else {
                var rowCount = controller.get('rowCount') ? controller.get('rowCount') : controller.tabContent.row;
                var colCount = controller.get('colCount') ? controller.get('colCount') : controller.tabContent.col;

                // Height of a single container is calculated by considering the overall height and the number of rows in the layout
                // This function is derived based on the height calculation function available in the grid stack framework
                // To be precise, below function is the inverse of the grid stack height calculation function
                // Values returning from this function is tested for most of the cases in different resolutions
                // But there may be exceptions encountered for some resolutions
                // top panel + footer = 145px
                var height = ((((viewHeight - 145 - (this.hGap * (rowCount - 1))) / rowCount) - this.cellHeight) / (this.cellHeight + this.hGap)) + 1;
                height = Math.floor(height);

                // Width of a single container is simply calculated by dividing the available column count by user selected column count
                var width = this.amountOfCols / colCount;

                var widgetCount = rowCount * colCount;
                var coordinates = this.calculateCoordinates(rowCount, colCount, height, width);
                var extraCoordinates = this.calculateExtraCoordinates(widgetCount, rowCount, colCount, height);

                htmlArray = this.generateLayoutHtml(htmlArray, controller, coordinates, extraCoordinates, height, width, widgetCount);
            }

            htmlArray[htmlArray.length] = '</div>';
            Ember.set(this, 'template', Ember.HTMLBars.compile(htmlArray.join(utils.Constants.StringConst.Empty)));
        }
    }.on('init'),

    didInsertElement: function () {
        var controller = this.get('controller.targetController');

        if (controller) {
            var rowCount = controller.get('rowCount') ? controller.get('rowCount') : controller.tabContent.row;
            var colCount = controller.get('colCount') ? controller.get('colCount') : controller.tabContent.col;
            var widgetCount = rowCount * colCount;
            var complexLayoutContent = controller.get('complexLayoutContent');

            if (complexLayoutContent) {
                widgetCount = complexLayoutContent.widgetCount;
            }

            if (!controller.tabContent.w || controller.tabContent.w.length === 0) {
                this.generateWidget(controller, widgetCount);
            } else {
                Ember.$.each(controller.tabContent.w, function (wKey, widgetDef) {
                    if (widgetDef && widgetDef.iw) {
                        controller.prepareWidget(controller.menuContent, controller.tabContent, widgetDef);
                    }
                });
            }

            this.initializeContainers();
            this.loadWorkspaceContent(controller);
        }

        this._super();
    },

    initializeContainers: function () {
        var that = this;
        var grid = Ember.$('.grid-stack').data('gridstack');

        if (grid) {
            Ember.$('div[grid-name=gs-w-c]').each(function () {
                var containerId = this.attributes['grid-index'].value;
                var isActive = this.attributes['active-c'].value === utils.Constants.Yes;
                var isWidgetAdded = that.get('targetController').widgetMap['w' + containerId];
                var isResizable = false;

                if (isWidgetAdded || isActive) {
                    grid.min_height(this, 5); // Number of rows for minimum height
                    isResizable = true;
                }

                grid.resizable(this, isResizable);
            });
        }
    },

    loadWorkspaceContent: function (customLayout) {
        var options = {
            /*eslint-disable */
            cell_height: 5, // Set unit cell height
            vertical_margin: 5, // Vertical gap between rows
            /*eslint-enable */
            resizable: {
                handles: 'se, sw' // Resizing is available in these direction e, se, s, sw, w
            },
            draggable: {
                handle: '.wdgttl' // Dragging will be enabled only in 'wdgttl' class
            }
        };

        var gridDiv = Ember.$('.grid-stack');

        if (!gridDiv.data('gridstack')) {
            gridDiv.gridstack(options);

            gridDiv.on('change', function () {
                customLayout.saveWorkspace();
            });

            gridDiv.on('resizestop', function (event, ui) {
                customLayout.onResizeContainer(event, ui);
            });
        }
    },

    generateLayoutHtml: function (htmlArray, controller, coordinates, extraCoordinates, height, width, widgetCount) {
        for (var i = 0; i < this.maximumWidgetCount; i++) {
            var index = i + 1;

            if (i < widgetCount) {
                Ember.set(controller.outletMap, 'o' + index, '');
                htmlArray[htmlArray.length] = templateGenerator.generateWorkspaceWidgetContainer(index, height, width, coordinates[i], true);
            } else {
                Ember.set(controller.outletMap, 'o' + index, 'display: none');
                htmlArray[htmlArray.length] = templateGenerator.generateWorkspaceWidgetContainer(index, 1, 12, extraCoordinates[i], false);
            }

            Ember.set(controller.widgetMap, 'w' + index, false);
        }

        return htmlArray;
    },

    generateComplexLayoutHtml: function (htmlArray, controller, coordinates, extraCoordinates, heights, widths, widgetCount) {
        for (var i = 0; i < this.maximumWidgetCount; i++) {
            var index = i + 1;

            if (i < widgetCount) {
                Ember.set(controller.outletMap, 'o' + index, '');
                htmlArray[htmlArray.length] = templateGenerator.generateWorkspaceWidgetContainer(index, heights[i], widths[i], coordinates[i], true);
            } else {
                Ember.set(controller.outletMap, 'o' + index, 'display: none');
                htmlArray[htmlArray.length] = templateGenerator.generateWorkspaceWidgetContainer(index, 1, 12, extraCoordinates[i], false);
            }

            Ember.set(controller.widgetMap, 'w' + index, false);
        }

        return htmlArray;
    },

    generateWidget: function (controller, widgetCount) {
        for (var i = 0; i < this.maximumWidgetCount; i++) {
            var index = i + 1;

            if (i < widgetCount) {
                controller.setWidgetToContainer(index, this.widgetList.selection);
            }
        }
    },

    generateWorkspaceHtml: function (htmlArray, controller, workspace) {
        Ember.$.each(workspace, function (key, containerObj) {
            var index = containerObj.i;
            var activeContainer = containerObj.act === utils.Constants.Yes;

            htmlArray[htmlArray.length] = templateGenerator.generateWorkspaceWidgetContainer(index, containerObj.h, containerObj.w, {
                x: containerObj.x,
                y: containerObj.y
            }, activeContainer);

            if (activeContainer) {
                Ember.set(controller.outletMap, 'o' + index, '');
            } else {
                Ember.set(controller.outletMap, 'o' + index, 'display: none');
            }

            Ember.set(controller.widgetMap, 'w' + index, false);
        });

        return htmlArray;
    },

    calculateCoordinates: function (rowCount, colCount, height, width) {
        var coordinates = [];
        var index;

        for (var i = 0; i < rowCount; i++) {
            for (var j = 0; j < colCount; j++) {
                index = (colCount * i) + j;
                coordinates[index] = coordinates[index] || {};
                coordinates[index].x = width * j;
            }
        }

        for (var k = 0; k < colCount; k++) {
            for (var l = 0; l < rowCount; l++) {
                index = (colCount * l) + k;
                coordinates[index] = coordinates[index] || {};
                coordinates[index].y = height * l;
            }
        }

        return coordinates;
    },

    calculateExtraCoordinates: function (widgetCount, rowCount, colCount, height) {
        var coordinates = [];
        var index = widgetCount;
        var extraWidgetCount = this.maximumWidgetCount - widgetCount;
        var extraRows = Math.ceil(extraWidgetCount / this.amountOfCols);
        var yStart = height * rowCount;

        for (var i = 0; i < extraRows; i++) {
            for (var j = 0; j < this.amountOfCols; j++) {
                coordinates[index] = coordinates[index] || {};
                coordinates[index].y = (i * this.amountOfCols) + yStart + j;
                coordinates[index].x = 0;

                index++;

                if (index >= this.maximumWidgetCount) {
                    return coordinates;
                }
            }
        }

        return coordinates;
    },

    calculateHeight: function (viewHeight, rowCounts, widgetCount) {
        var heights = [];

        for (var i = 0; i < widgetCount; i++) {
            var height = ((((viewHeight - 145 - (this.hGap * (rowCounts[i] - 1))) / rowCounts[i]) - this.cellHeight) / (this.cellHeight + this.hGap)) + 1;
            heights[i] = Math.ceil(height);
        }

        return heights;
    },

    calculateComplexCoordinates: function (coordinates, yCoordinateArray, heightArray) {
        for (var i = 0; i < heightArray.length; i++) {
            coordinates[i].y = heightArray[i] * yCoordinateArray[i];
        }

        return coordinates;
    }
});
