import utils from '../../utils/utils';

function Node(value) {
    this.value = value;
    this.paramArray = [];
    this.reqCount = 0;
    this.children = {};
    this.hasOwnChildren = false;
    this.parent = null;

    this.setParentNode = function (node) {
        this.parent = node;
    };

    this.addChild = function (node) {
        node.setParentNode(this);
        this.children[node.value] = node;

        // Fill the param array using the parent node values
        node.paramArray.push.apply(node.paramArray, this.paramArray);
        node.paramArray.push(node.value);
    };

    this.getChildren = function () {
        return this.children;
    };

    this.increaseRequestCount = function () {
        this.reqCount++;
    };

    this.decreaseRequestCount = function () {
        this.reqCount--;

        if (this.reqCount < 0) {
            utils.logger.logDebug('ERROR : Invalid subscription handling for value : ' + this.value + ' req Count : ' + this.reqCount);
            this.reqCount = 0;
        }
    };
}

export default (function () {
    var root = new Node('root');

    var addSubscription = function (type, exchange, symbol, subMkt) {
        var retVal;
        var reqArray = [];

        // If subMkt is available symbol can't be undefined
        if (subMkt !== undefined && symbol !== undefined) {
            retVal = _addSubscription(root, [type, exchange, symbol, subMkt], 0, true, reqArray);
        } else if (symbol !== undefined) {
            retVal = _addSubscription(root, [type, exchange, symbol], 0, true, reqArray);
        } else if (exchange !== undefined) {
            retVal = _addSubscription(root, [type, exchange], 0, true, reqArray);
        } else {
            // This cannot happen. So return error value
            retVal = {retVal: -1, reqArray: reqArray};
        }

        return retVal;
    };

    var removeSubscription = function (type, exchange, symbol, subMkt) {
        var retVal;
        var reqArray = [];

        if (subMkt !== undefined && symbol !== undefined) {
            retVal = _removeSubscription(root, [type, exchange, symbol, subMkt], 0, true, reqArray);
        } else if (symbol !== undefined) {
            retVal = _removeSubscription(root, [type, exchange, symbol], 0, true, reqArray);
        } else if (exchange !== undefined) {
            retVal = _removeSubscription(root, [type, exchange], 0, true, reqArray);
        } else {
            // This cannot happen. So return default value
            retVal = {retVal: -1, reqArray: reqArray};
        }

        return retVal;
    };

    var getCurrentSubscriptions = function () {
        var reqArray = [];

        _getChildSubscriptions(root, reqArray);

        return reqArray;
    };

    var _getChildSubscriptions = function (currentNode, reqArray) {
        var children = currentNode.getChildren();

        for (var property in children) {
            if (children.hasOwnProperty(property)) {
                var iterationNode = children[property];

                if (iterationNode.reqCount > 0) {
                    _sendRequest(iterationNode.paramArray, reqArray);
                } else {
                    _getChildSubscriptions(iterationNode, reqArray);
                }
            }
        }
    };

    var _sendRequest = function (arrValues, reqArray) {
        var len = arrValues.length;
        var req;

        switch (len) {
            case 3:
                var type = parseInt(arrValues[0], 10);

                if (type === 77 || type === 27) {
                    req = ['{"40":"', arrValues[0], '","E":"', arrValues[1], '","L":"', arrValues[2], '"}\n'].join('');
                } else {
                    // 80 type general requests
                    req = ['{"80":"', arrValues[0], '","E":"', arrValues[1], '","S":"', arrValues[2], '"}\n'].join('');
                }
                break;

            case 2:
                // 40 type general requests
                req = ['{"40":"', arrValues[0], '","E":"', arrValues[1], '"}\n'].join('');
                break;

            default:
                utils.logger.logWarning('Un-known subscription tree state');
                break;
        }

        if (req) {
            req = req.length + req;
            reqArray[reqArray.length] = req;
        }
    };

    var _addSubscription = function (currentNode, arrValues, indexToProcess, sendAddRequests, reqArray) {
        // Get the children list
        var children = currentNode.getChildren();

        if (arrValues.length === indexToProcess) {
            // Time to exit :)
            // Check if there are child nodes under current node
            if (currentNode.hasOwnChildren) {
                // Send un - subscriptions to all children as they are masked by the parent node's subscription
                for (var property in children) {
                    // All these must be 80 type requests
                    if (children.hasOwnProperty(property)) {
                        var iterationNode = children[property];

                        if (iterationNode.reqCount > 0) {
                            var req = ['{"81":"', arrValues[0], '","E":"', arrValues[1], '","S":"', iterationNode.value, '"}\n'].join('');
                            req = req.length + req;

                            reqArray[reqArray.length] = req;
                        }
                    }
                }
            }

            currentNode.increaseRequestCount();

            if (sendAddRequests) {
                return {retVal: currentNode.reqCount, reqArray: reqArray};
            } else {
                return {retVal: -1, reqArray: reqArray};
            }
        }

        var newNode;
        var param = arrValues[indexToProcess];
        var _sendAddRequests = true;

        if (!children[param]) {
            newNode = new Node(param);
            currentNode.addChild(newNode);

            if (currentNode.reqCount > 0) {
                // Add child but no need to send requests as there is already active subscription covering it
                _sendAddRequests = false;
            }

            currentNode.hasOwnChildren = true;
        } else {
            newNode = children[param];
        }

        return _addSubscription(newNode, arrValues, indexToProcess + 1, _sendAddRequests, reqArray);
    };

    var _removeSubscription = function (currentNode, arrValues, indexToProcess, sendRemoveRequests, reqArray) {
        // Get the children list
        var children = currentNode.getChildren();

        if (arrValues.length === indexToProcess) {
            // Time to exit :)

            // Check if there are child nodes under current node
            if (currentNode.hasOwnChildren) {
                // Send un - subscriptions to all children as they are masked by the parent node's subscription
                for (var property in children) {
                    // All these must be 80 type requests
                    if (children.hasOwnProperty(property)) {
                        var iterationNode = children[property];

                        if (iterationNode.reqCount > 0) {
                            var req = ['{"80":"', arrValues[0], '","E":"', arrValues[1], '","S":"', iterationNode.value, '"}\n'].join('');
                            req = req.length + req;

                            reqArray[reqArray.length] = req;
                        }
                    }
                }
            }

            currentNode.decreaseRequestCount();

            if (sendRemoveRequests) {
                return {retVal: currentNode.reqCount, reqArray: reqArray};
            } else {
                return {retVal: -1, reqArray: reqArray};
            }
        }

        var newNode;
        var param = arrValues[indexToProcess];
        var _sendRemoveRequests = true;

        if (!children[param]) {
            // This is an error. Un-subscription cannot happen without a subscription
            // Return an error
            return {retVal: -1, reqArray: reqArray};
        } else {
            newNode = children[param];

            if (currentNode.reqCount > 0) {
                _sendRemoveRequests = false;
            }
        }

        return _removeSubscription(newNode, arrValues, indexToProcess + 1, _sendRemoveRequests, reqArray);
    };

    return {
        addSubscription: addSubscription,
        removeSubscription: removeSubscription,
        getCurrentSubscriptions: getCurrentSubscriptions
    };
})();
