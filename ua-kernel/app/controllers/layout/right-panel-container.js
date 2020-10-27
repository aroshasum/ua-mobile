import Ember from 'ember';
import BaseWidgetContainer from '../base-widget-container';
import ControllerFactory from '../controller-factory';
import sharedService from '../../models/shared/shared-service';
import responsiveHandler from '../../helpers/responsive-handler';

export default BaseWidgetContainer.extend({
    // Subscription key
    containerKey: 'rightPanel',
    currRightPanel: undefined,
    prevRightPanelId: undefined,

    onLoadContainer: function () {
        var menuPanelContainer = sharedService.getService('sharedUI').getService('menuPanel');

        this._super();
        this.set('mainPanelWidth', menuPanelContainer.isHorizontalPanel ? 'main-panel-width-h-nav' : 'main-panel-width');
        this.set('mainPanelWidthResponsive', menuPanelContainer.isHorizontalPanel ? 'full-width' : 'main-panel-width-responsive');
        this.set('tabCacheMap', {});
    },

    renderRightPanelView: function (widgetDef, renderOptions, menuObj, tabObj) {
        if (widgetDef) {
            var widgetController;
            var menuContent = menuObj ? menuObj : this.menuContent;
            var tabContent = tabObj ? tabObj : this.tabContent;

            if (renderOptions && (renderOptions.isFirstTime || renderOptions.isUserClick)) {
                this.setActive(widgetDef.id);
            }

            if (!this.get('tabCacheMap')[widgetDef.rightPanelTitleKey]) {
                widgetController = ControllerFactory.createController(this.container, 'controller:' + widgetDef.wn);

                this.router.render(widgetDef.wn, {
                    into: 'application',
                    outlet: widgetDef.rightPanelTitleKey,
                    controller: widgetController
                });

                Ember.set(this.get('tabCacheMap'), widgetDef.rightPanelTitleKey, true);
                this.setContainerWidget(menuContent.id, tabContent.id, widgetDef.id, widgetController);

                var widgetArgs = this.getWidgetArgs(widgetDef, tabContent, menuContent);
                widgetController.initializeWidget(widgetDef, widgetArgs, this, menuContent, tabContent);
            }

            if (renderOptions && (renderOptions.isFirstTime || renderOptions.isUserClick)) {
                this._loadRightPanel(widgetDef, tabObj);
            }
        }
    },

    onAfterRender: function () {
        this._loadRightPanel();
        this.initializeResponsive();
    },

    initializeResponsive: function () {
        this.set('responsive', responsiveHandler.create({controller: this, widgetId: 'appTitle', callback: this.onResponsive}));

        this.responsive.addList('appTitle', [{id: 'appTitle', width: 991}]);
        this.responsive.initialize();
    },

    onResponsive: function (responsiveArgs) {
        var controller = responsiveArgs.controller;

        Ember.run.later(function () {
            controller.setResponsive(responsiveArgs);
        }, 1);
    },

    setResponsive: function (responsiveArgs) {
        var rightPanel = Ember.$('#rightPanelWidget');
        var controller = responsiveArgs.controller;
        controller.set('responsiveLevel', responsiveArgs.responsiveLevel);

        if (responsiveArgs.responsiveLevel === 1) {
            rightPanel.removeClass('position-show');
            rightPanel.addClass('position-hide');

            if (controller.menuContent.rightPanel > 0) {
                Ember.set(controller.router.get('controller'), 'mainPanelStyle', this.get('mainPanelWidth'));
            }
        } else {
            rightPanel.removeClass('position-hide');
            rightPanel.addClass('position-show');

            if (controller.menuContent.rightPanel > 0) {
                Ember.set(controller.router.get('controller'), 'mainPanelStyle', this.get('mainPanelWidthResponsive'));
            }
        }
    },

    setActive: function (currentTabId) {
        var tabArray = this.get('appLayout').layout.rightPanel.content;

        Ember.$.each(tabArray, function (key, tabObj) {
            if (tabObj.id === currentTabId) {
                Ember.set(tabObj, 'css', 'active');
            } else {
                Ember.set(tabObj, 'css', '');
            }
        });
    },

    // Return args from layout-config or localStorage
    filterWidgetArgs: function (args, widgetDef) {
        var filteredArgs = {};

        if (args && args[widgetDef.id]) {
            filteredArgs = args[widgetDef.id];
        }

        return filteredArgs;
    },

    // Return args to save in localStorage
    getSaveWidgetArgs: function (menuId, tabId, baseWidgetId, widgetId, widgetArgs) {
        var storedArgs = sharedService.userState.defaultWS[this.get('containerKey')] || {};
        storedArgs[widgetId] = widgetArgs;

        return storedArgs;
    },

    languageChanged: function (language) {
        this._super(language);
        this.setLanguageParams();
    },

    setLanguageParams: function () {
        var rightPanelContent = this.get('appLayout').layout.rightPanel.content;
        var that = this;

        if (rightPanelContent && rightPanelContent.length > 0) {
            Ember.$.each(rightPanelContent, function (index, layout) {
                if (layout) {
                    var rightPanelTitleKey = layout.rightPanelDesc ? layout.rightPanelDesc : layout.rightPanelTitleKey;
                    Ember.set(layout, 'rightPanelTitleValue', that.get('app').lang.labels[rightPanelTitleKey]);
                }
            });
        }
    },

    getRightPanel: function (menuContent, tabContent, renderOptions, isReRender) {
        var rightPanel;
        var rightPanelContent = this.get('appLayout').layout.rightPanel.content;
        var adjustRightPanel = renderOptions && (renderOptions.isFirstTime || renderOptions.isUserClick);

        if (adjustRightPanel) {
            this.menuContent = menuContent;
            this.tabContent = tabContent;
        }

        if (menuContent.rightPanel) {
            // Right panel is specifically set
            if (tabContent.rightPanel) { // Check right panel specify in the tab level
                var isShow;

                if (tabContent.rightPanel > 0) {
                    if (rightPanelContent && rightPanelContent.length > 0) {
                        Ember.$.each(rightPanelContent, function (index, layout) {
                            if (tabContent.rightPanel === layout.id) {
                                rightPanel = layout;
                            }
                        });
                    }

                    isShow = true;
                    this.currRightPanel = rightPanel;
                } else {
                    isShow = false;
                }

                this._showHideRightPanel(isShow, adjustRightPanel);
            } else if (menuContent.rightPanel > 0) {
                if (rightPanelContent && rightPanelContent.length > 0) {
                    Ember.$.each(rightPanelContent, function (index, layout) {
                        if (menuContent.rightPanel === layout.id) {
                            rightPanel = layout;
                        }
                    });
                }

                this._showHideRightPanel(true, adjustRightPanel);
                this.currRightPanel = rightPanel;
            } else {
                this._showHideRightPanel(false, adjustRightPanel);
            }
        } else if (isReRender) {
            // Default loading
            rightPanel = this._getDefaultRightPanel(rightPanelContent);
            this._showHideRightPanel(true, adjustRightPanel);
            this.currRightPanel = rightPanel;
        } else {
            if (!this.currRightPanel) {
                // Default loading
                rightPanel = this._getDefaultRightPanel(rightPanelContent);
                this._showHideRightPanel(true, adjustRightPanel);
                this.currRightPanel = rightPanel;
            } else {
                // Loading previous right panel
                rightPanel = this.currRightPanel;
                this._showHideRightPanel(true, adjustRightPanel);
            }
        }

        this.setLanguageParams();

        return rightPanel;
    },

    _getDefaultRightPanel: function (rightPanelContent) {
        var defTabLayout = {};

        if (rightPanelContent && rightPanelContent.length > 0) {
            Ember.$.each(rightPanelContent, function (index, layout) {
                if (layout.def) {
                    defTabLayout = layout;
                    return false;
                }
            });
        }

        return defTabLayout;
    },

    _showHideRightPanel: function (isShow, adjustRightPanel) {
        if (adjustRightPanel) {
            if (isShow) {
                Ember.set(this.router.get('controller'), 'mainOutletStyle', 'col-md-10 col-xs-12 full-height');
                Ember.set(this.router.get('controller'), 'rightPanelStyle', '');
                Ember.set(this.router.get('controller'), 'mainPanelStyle', this.get('mainPanelWidthResponsive'));
                Ember.set(this.router.get('controller'), 'rightCollapseStyle', 'display: none');

                var rightPanel = Ember.$('#rightPanelWidget');

                if (this.get('responsiveLevel') === 1) {
                    rightPanel.removeClass('position-show');
                    rightPanel.addClass('position-hide');

                } else {
                    rightPanel.removeClass('position-hide');
                    rightPanel.addClass('position-show');
                }

            } else {
                Ember.set(this.router.get('controller'), 'mainOutletStyle', 'col-xs-12 full-height');
                Ember.set(this.router.get('controller'), 'rightPanelStyle', 'visibility: hidden');
                Ember.set(this.router.get('controller'), 'mainPanelStyle', this.get('mainPanelWidth'));
                Ember.set(this.router.get('controller'), 'rightCollapseStyle', '');
            }
        }
    },

    _loadRightPanel: function (widgetDef) {
        var rightPanel = widgetDef ? widgetDef : this.currRightPanel;

        if (rightPanel) {
            var appendToDiv = Ember.$('div#rpl-standardOutlet');

            if (this.prevRightPanelId) {
                var prevParentDiv = Ember.$('div#rpl-parent-' + this.prevRightPanelId);
                Ember.$('div#rpl-' + this.prevRightPanelId).appendTo(prevParentDiv);
            }

            Ember.$('div#rpl-' + rightPanel.rightPanelTitleKey).appendTo(appendToDiv);
            this.prevRightPanelId = rightPanel.rightPanelTitleKey;
        }
    }
});
