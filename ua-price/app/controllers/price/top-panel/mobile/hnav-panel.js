/* global Hammer */
import Ember from 'ember';
import BaseWidgetContainer from '../../../base-widget-container';
import sharedService from '../../../../models/shared/shared-service';

export default BaseWidgetContainer.extend({
    containerKey: 'hnavPanel',
    mainOutlet: 'price.widgets.mobile.market-overview-tab',
    currentMenu: '',
    isFullWidthMenu: false,

    options: {
        dragLockToAxis: true,
        dragBlockHorizontal: true
    },

    onLoadContainer: function () {
        this._super();
        this._setMenuTitle();
    },

    languageChanged: function () {
        this._setMenuTitle();
    },

    onAfterRender: function () {
        var that = this;
        var initHorizontalPosition = 0;
        var initVerticalPosition = 0;

        var hammerObj = new Hammer(document.getElementById('mainPanelOutletContainer'), this.options);
        hammerObj.get('swipe').set({velocity: 0.1});

        // Prevent default horizontal behavior and let Hammer handles it
        Ember.$('#mainPanelOutletContainer').bind('touchstart', function (e) {
            initVerticalPosition = e.originalEvent.touches[0].clientY;
            initHorizontalPosition = e.originalEvent.touches[0].clientX;
        });

        Ember.$('#mainPanelOutletContainer').bind('touchmove', function (e) {
            var currentY = e.originalEvent.touches[0].clientY;
            var currentX = e.originalEvent.touches[0].clientX;

            if (Math.abs(initVerticalPosition - currentY) < Math.abs(initHorizontalPosition - currentX) && !Ember.isSwipeDisable) {
                e.preventDefault();
            }

            Ember.isSwipeDisable = false;
        });

        hammerObj.on('swipeleft swiperight', function (ev) {
            var activeTab = sharedService.getService('sharedUI').getService('mainPanel').get('activeTab');
            var menuContent = sharedService.getService('sharedUI').getService('mainPanel').get('menuContent');
            var swipeDirection = 'swipeleft';
            var swipedTab = '';
            var isArabic = sharedService.userSettings.currentLanguage === 'AR';

            if (isArabic) { // For Arabic Language
                swipeDirection = 'swiperight';
            }

            if (!Ember.isQuoteStatusSwipeTriggered) {
                swipedTab = that.getSwipedTabItem(menuContent.tab, activeTab, ev.type === swipeDirection);

                if (swipedTab) {
                    sharedService.getService('sharedUI').getService('mainPanel').onRenderCss(swipedTab);
                    sharedService.getService('priceUI').changeSwipeView(ev.type === swipeDirection);
                    that.scrollSubMenuItems(swipedTab, menuContent.title);

                    Ember.run.later(function () {
                        sharedService.getService('priceUI').changeSwipeView(ev.type === swipeDirection, true);
                    }, 200);

                    Ember.run.later(function () {
                        sharedService.getService('sharedUI').getService('mainPanel').onRenderTabItems(swipedTab);
                    }, 200);
                } else {
                    sharedService.getService('priceUI').setInnerTabSwipe(ev.type === swipeDirection);
                }
            } else {
                Ember.isQuoteStatusSwipeTriggered = false;
            }
        });
    },

    _setMenuTitle: function () {
        var that = this;
        var menuArray = this.get('appLayout').layout.mainPanel.content;

        Ember.$.each(menuArray, function (key, menuObj) {
            try {
                Ember.set(menuObj, 'displayMainTitle', that.get('app').lang.labels[menuObj.titleKey] ? that.get('app').lang.labels[menuObj.titleKey] : that.get('app').lang.labels[menuObj.title]);
            } catch (e) {
                menuObj.displayMainTitle = that.get('app').lang.labels[menuObj.titleKey] ? that.get('app').lang.labels[menuObj.titleKey] : that.get('app').lang.labels[menuObj.title];
            }
        });
    },

    setActiveMenu: function (currentMenu, tabId) {
        var that = this;
        var menuArray = this.get('appLayout').layout.mainPanel.content;
        var tabContent = '';
        var tabContentId = tabId ? tabId : 1;

        // At first time, object behaves as a normal javascript object
        // After that object is an ember object
        // Still we cannot call .set() directly on the object
        // Need to call Ember.set() instead
        Ember.$.each(menuArray, function (key, menuObj) {
            if (menuObj.id === currentMenu.id) {
                var isFullWidthMenu = that.getFullWidthMenu(menuObj);
                var subMenuCss = (menuObj.tab.length > 1 && !menuObj.expandId) ? (sharedService.userSettings.currentLanguage === 'AR' && !isFullWidthMenu) ? 'dot-panel-container' : isFullWidthMenu ? '' : 'display-inline-block' : 'display-none';

                that.set('currentMenu', menuObj);
                that.router.set('disableSubMenu', !(menuObj.tab.length > 1 && !menuObj.expandId));
                tabContent = menuObj.tab[tabContentId - 1];

                try {
                    Ember.set(menuObj, 'mainMenuCss', 'appmnu-sidebar-active');
                    Ember.set(menuObj, 'subMenuCss', subMenuCss);
                } catch (e) {
                    menuObj.mainMenuCss = 'appmnu-sidebar-active';
                    menuObj.subMenuCss = subMenuCss;
                }

            } else {
                try {
                    Ember.set(menuObj, 'mainMenuCss', '');
                    Ember.set(menuObj, 'subMenuCss', 'display-none');
                } catch (e) {
                    menuObj.mainMenuCss = '';
                    menuObj.subMenuCss = 'display-none';
                }
            }
        });

        if (tabContent) {
            Ember.run.later(function () {
                that.scrollSubMenuItems(tabContent, that.get('currentMenu.title'));
            }, 300);
        }
    },

    getFullWidthMenu: function (menuObj) {
        var currentMenu = menuObj ? menuObj : this.get('currentMenu');
        var isFullWidthMenu = false;

        if (currentMenu) {
            var tabArray = currentMenu.tab;
            var tabArrayLength = tabArray.length;

            if (tabArrayLength > 1) {
                var deviceWidth = window.innerWidth;
                var totalElementWidth = 0;
                var arabicCharWidth = 5;
                var defaultCharWidth = 6.5;
                var elementHorizontalPadding = 36;
                var averageCharWidth = sharedService.userSettings.currentLanguage === 'AR' ? arabicCharWidth : defaultCharWidth;

                Ember.$.each(tabArray, function (key, tabObj) {
                    if (tabObj.expandId !== -1) {
                        var tabTitle = tabObj.displayTitle ? tabObj.displayTitle : tabObj.title;
                        var tabTitleLength = tabTitle.length;
                        var elementLength = tabTitleLength * averageCharWidth + elementHorizontalPadding;

                        totalElementWidth = totalElementWidth + elementLength;
                    }

                    if (totalElementWidth > deviceWidth) {
                        return false;
                    }
                });

                if (totalElementWidth <= deviceWidth) {
                    isFullWidthMenu = true;
                }
            }
        }

        this.set('isFullWidthMenu', isFullWidthMenu);

        return isFullWidthMenu;
    },

    showTabPanel: function (tabArray) {
        Ember.$.each(tabArray, function (key, tabObj) {
            var tabElement = Ember.$('div[name=' + tabObj.title + tabObj.id + ']');
            tabElement.removeClass('visibility-hidden');
        });
    },

    hideTabPanel: function () {
        var currentMenu = this.get('currentMenu');

        if (currentMenu) {
            var tabArray = currentMenu.tab;

            Ember.$.each(tabArray, function (key, tabObj) {
                var tabElement = Ember.$('div[name=' + tabObj.title + tabObj.id + ']');
                tabElement.removeClass('visibility-hidden');
            });
        }
    },

    getSwipedTabItem: function (menuTabArray, activeTab, isNext) {
        var nextMenu = null;
        var tabArray = menuTabArray;
        var tabArrayLength = tabArray.length;

        if (tabArrayLength > 1) {
            var initialMenuKey = isNext ? 0 : tabArrayLength - 1;
            var endMenuKey = isNext ? tabArrayLength - 1 : 0;

            Ember.$.each(tabArray, function (key, tabObj) {
                if (tabObj.title === activeTab.title) {
                    var menuKey = isNext ? key + 1 : key - 1;

                    if (key === endMenuKey) {
                        nextMenu = tabArray[initialMenuKey];
                        menuKey = initialMenuKey;
                    } else {
                        nextMenu = tabArray[menuKey];
                    }

                    while (nextMenu && nextMenu.expandId === -1) {
                        menuKey = isNext ? menuKey + 1 : menuKey - 1;

                        if (menuKey === endMenuKey) {
                            nextMenu = tabArray[initialMenuKey];
                        } else {
                            nextMenu = tabArray[menuKey];
                        }
                    }

                    return false;
                }
            });
        }

        return nextMenu;
    },

    scrollSubMenuItems: function (tabContent, menuTitle) {
        if (tabContent) {
            var element = Ember.$('div[name=' + tabContent.title + tabContent.id + ']');
            var menuItem = Ember.$('div[name=' + menuTitle + ']');
            var offset = element.offset();
            var elementWidth = element.width();

            if (offset) {
                var scrollValue = menuItem.scrollLeft();
                var currentScrollValue = scrollValue ? scrollValue : 0;
                var scrollGap = window.screen.width - offset.left;

                if (offset && scrollGap < elementWidth * 2) {
                    var newScrollWidth = elementWidth;

                    if (scrollGap < 0) {
                        newScrollWidth = elementWidth * 2 - scrollGap;
                    }

                    menuItem.animate({scrollLeft: currentScrollValue + newScrollWidth}, 200, 'swing');
                } else if (offset.left < 0) {
                    menuItem.animate({scrollLeft: currentScrollValue + offset.left}, 200, 'swing');
                }
            }
        }
    },

    actions: {
        renderSubMenuItems: function (tabContent) {
            var that = this;
            sharedService.getService('sharedUI').getService('mainPanel').onRenderTabItems(tabContent);

            if (tabContent) {
                Ember.run.later(function () {
                    that.scrollSubMenuItems(tabContent, that.get('currentMenu.title'));
                }, 200);
            }
        }
    }
});