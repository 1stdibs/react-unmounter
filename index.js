'use strict';

var unmount = require('react-dom').unmountComponentAtNode;
var isElement = require('lodash.iselement');
var observing = [];

function observerCallback(records) {
    records.forEach(function (record) {
        var observable;

        // This shouldn't have to be done since childList will
        // be the only mutation get listened for (still need check
        // for removedNodes.length though)
        if (record.type !== 'childList' || record.removedNodes.length === 0) {
            return;
        }

        observable = observing.find(function (o) { return record.target === o.parent; });
        record.removedNodes.forEach(function (removedNode) {
            var nodeIndex = observable.reactNodes.indexOf(removedNode);
            if (nodeIndex < 0) {
                return;
            }

            if (unmount(observable.reactNodes[nodeIndex])) {
                observable.reactNodes.splice(nodeIndex, 1);
            }

            // If no reactNodes left to observe, disconnect observer
            // and remove from observing
            if (observable.reactNodes.length === 0) {
                observable.observer.disconnect();
                observing.splice(observing.indexOf(observable), 1);
            }
        });
    });
}

module.exports = function observe(componentEl) {
    var observable;
    var observer;
    var parent;

    // Don't break if MutationObserver isn't defined, just let them know.
    if (!MutationObserver) {
        console.warn('MutationObserver is not defined. This method does nothing.');
        return;
    }

    if (!isElement(componentEl)) {
        throw new TypeError('Parameter must be an DOM element. Instead found ' + typeof componentEl);
    }

    // TODO use parentNode or parentElement?
    parent = componentEl.parentNode;
    if (!parent) {
        throw new Error('Parameter is top-level element. Cannot observe.');
    }

    observable = observing.find(function (o) { return parent === o.parent; });
    if (observable) {
        observable.reactNodes.push(componentEl);
    } else {
        observer = new MutationObserver(observerCallback);
        observing.push({
            observer: observer,
            parent: parent,
            reactNodes: [componentEl]
        });
        observer.observe(parent, { childList: true });
    }
};
