(function () {
    if (!Array.indexOf) {
        Array.prototype.indexOf = function (obj, start) {
            for (var i = (start || 0); i < this.length; i++) {
                if (this[i] === obj) {
                    return i;
                }
            }

            return -1;
        };
    }

    Array.prototype.indicesOf = function (items, start) {
        var indexList = {}, arrIndex, i, count = 0;

        for (i = (start || 0); i < this.length; i++) {
            arrIndex = items.indexOf(this[i]);

            if (arrIndex !== -1) {
                count++;
                indexList[items[arrIndex]] = i;
                items.splice(arrIndex, 1);
            }

            if (items.length === 0) {
                break;
            }
        }

        indexList._count = count;

        return indexList;
    };

    Array.prototype.union = function (items) {
        var obj = {}, i, k, res = [];

        for (i = 0; i < this.length; i++) {
            obj[this[i]] = this[i];
        }

        for (i = 0; i < items.length; i++) {
            obj[items[i]] = items[i];
        }

        for (k in obj) {
            if (obj.hasOwnProperty(k)) {
                res.push(obj[k]);
            }
        }

        return res;
    };

    Array.prototype.subset = function (items) {
        var obj = {}, i, k, res = [];

        for (i = 0; i < this.length; i++) {
            obj[this[i]] = undefined;
        }

        for (i = 0; i < items.length; i++) {
            if (obj.hasOwnProperty([items[i]])) {
                obj[items[i]] = items[i];
            }
        }

        for (k in obj) {
            if (obj.hasOwnProperty(k) && obj[k] !== undefined) {
                res.push(obj[k]);
            }
        }

        return res;
    };

    Array.prototype.unique = function () {
        return this.union([]);
    };

    Array.prototype.replaceInClone = function (oItem, nItem) {
        var val, i, res = [];

        for (i = 0; i < this.length; i++) {
            val = (this[i] === oItem) ? nItem : this[i];
            res.push(val);
        }

        return res;
    };

    Array.prototype.removeItems = function (itemsToRemove) {
        var items = itemsToRemove;

        if (!/Array/.test(items.constructor)) {
            items = [items];
        }

        var j, i;

        for (i = 0; i < items.length; i++) {
            j = 0;

            while (j < this.length) {
                if (this[j] === items[i]) {
                    this.splice(j, 1);
                } else {
                    j++;
                }
            }
        }

        return this;
    };

    Array.prototype.removeInClone = function (itemsToRemove) {
        var res = [];
        var items = itemsToRemove;

        if (!/Array/.test(items.constructor)) {
            items = [items];
        }

        var i;

        for (i = 0; i < this.length; i++) {
            if (items.indexOf(this[i]) === -1) {
                res[res.length] = this[i];
            }
        }

        return res;
    };

    Array.prototype.count = function (val) {
        var count = 0, i;

        for (i = 0; i < this.length; i++) {
            if (this[i] === val) {
                count++;
            }
        }

        return count;
    };

    String.prototype.replaceAll = function (search, replace) {
        if (replace === undefined) {
            return this.toString();
        }

        return this.split(search).join(replace);
    };

    String.prototype.trim = function () {
        var str = this.replace(/^\s*/, '').replace(/\s*$/, '');
        str = str.replaceAll('  ', ' ');

        return str.toString();
    };

    String.prototype.isEmpty = function () {
        return this.trim() === '';
    };

    String.prototype.isStartedWith = function (str) {
        return (this.toLowerCase().indexOf(str.toLowerCase()) === 0);
    };

    String.prototype.isExactMatch = function (str) {
        return this.toLowerCase() === str.toLowerCase();
    };

    String.prototype.isExist = function (str) {
        return (this.toLowerCase().indexOf(str.toLowerCase()) !== -1);
    };
})();
