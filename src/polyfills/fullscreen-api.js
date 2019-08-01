(function (win, doc, Element, TypeError, Promise) {

    let apis = [{
        name: "w3",
        enabled: "fullscreenEnabled",
        element: "fullscreenElement",
        request: "requestFullscreen",
        exit:    "exitFullscreen",
        events: {
            change: "fullscreenchange",
            error:  "fullscreenerror"
        }
    }, {
        name: "webkit",
        enabled: "webkitFullscreenEnabled",
        element: "webkitCurrentFullScreenElement",
        request: "webkitRequestFullscreen",
        exit:    "webkitExitFullscreen",
        events: {
            change: "webkitfullscreenchange",
            error:  "webkitfullscreenerror"
        }
    }, {
        name: "moz",
        enabled: "mozFullScreenEnabled",
        element: "mozFullScreenElement",
        request: "mozRequestFullScreen",
        exit:    "mozCancelFullScreen",
        events: {
            change: "mozfullscreenchange",
            error:  "mozfullscreenerror"
        }
    },
        {
            name: "ms",
            enabled: "msFullscreenEnabled",
            element: "msFullscreenElement",
            request: "msRequestFullscreen",
            exit:    "msExitFullscreen",
            events: {
                change: "MSFullscreenChange",
                error:  "MSFullscreenError"
            }
        }

    ];

    let [w3] = apis;

    let api = apis.find(vendor => vendor.enabled in doc);

    if(!api) return console.warn("fullscreen is not supported");

    if (api !== w3) {

        doc.addEventListener(api.events.change, handleChange, false);
        doc.addEventListener(api.events.error, handleError, false);

        doc[w3.enabled] = doc[api.enabled];
        doc[w3.element] = doc[api.element];

        doc[w3.exit] = function () {
            let result = doc[api.exit]();
            return !result && Promise ? new Promise(createResolver(w3.exit)) : result;
        };

        Element.prototype[w3.request] = function (...args) {
            if(doc[api.element]) return new Promise(function (resolve) {
                setTimeout(()=>resolve());
            });
            let result = this[api.request].apply(this, ...args);
            return !result && Promise ? new Promise(createResolver(w3.request)) : result;
        };

    }

    function dispatch(type, target) {
        let event = doc.createEvent("Event");
        event.initEvent(type, true, false);
        target.dispatchEvent(event);
    }

    function handleChange(e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        doc[w3.enabled] = doc[api.enabled];
        doc[w3.element] = doc[api.element];
        dispatch(w3.events.change, e.target);
    }

    function handleError(e) {
        dispatch(w3.events.error, e.target);
    }

    function createResolver(method) {
        return function resolver(resolve, reject) {
            // Reject the promise if asked to exitFullscreen and there is no element currently in fullscreen
            if (method === w3.exit && !doc[api.element]) {
                setTimeout(function () {
                    reject(new TypeError());
                }, 0);
                return;
            }

            // When receiving an internal fullscreenchange event, fulfill the promise
            function change() {
                resolve();
                doc.removeEventListener(api.events.change, change, false);
            }

            // When receiving an internal fullscreenerror event, reject the promise
            function error() {
                reject(new TypeError());
                doc.removeEventListener(api.events.error, error, false);
            }

            doc.addEventListener(api.events.change, change, false);
            doc.addEventListener(api.events.error, error, false);
        };
    }

})(
    window,
    document,
    Element,
    TypeError,
    typeof Promise !== "undefined" && Promise
);