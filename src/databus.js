/* global using, setTimeout, console, window, module */

(function DataBusBootstrap () {
    
    if (typeof using === "function") {
        using().define("databus", DataBusModule);
    }
    else if (typeof window !== "undefined") {
        window.databus = DataBusModule();
    }
    else {
        module.exports = DataBusModule();
    }
    
    function DataBusModule () {
        
        "use strict";
        
        function DataBus (args) {
            
            var self = this;
            
            args = args || {};
            
            this.debug = args.debug || false;
            this.interceptErrors = args.interceptErrors || false;
            this.log = args.log || false;
            this.logData = args.logData || false;
            this.defaults = args.defaults || {};
            this.defaults.flowType = this.defaults.flowType || DataBus.FLOW_TYPE_ASYNCHRONOUS;
            
            this.callbacks = {
                "*": []
            };
            
            this.subscribe(errorListener, "EventBus.error");
            
            function errorListener (data) {
                
                var name;
                
                if (self.debug !== true) {
                    return;
                }
                
                name = data.error.name || "Error";
                console.log(name + " in listener; Event: " + data.info.event + "; Message: " +
                    data.error.message);
            }
        }
        
        DataBus.FLOW_TYPE_ASYNCHRONOUS = 0;
        DataBus.FLOW_TYPE_SYNCHRONOUS = 1;
        
        DataBus.create = function(args) {
            
            args = args || {};
            
            return new DataBus(args);
        };
        
        DataBus.prototype.subscribe = function(parameter1, parameter2) {
            
            var listener, event, self = this;
            
            if (parameter2 === undefined) {
                event = "*";
                listener = parameter1;
            }
            else if (typeof parameter1 === "string" || typeof parameter1 === "number") {
                event = parameter1;
                listener = parameter2;
            }
            else if (typeof parameter2 === "string" || typeof parameter2 === "number") {
                event = parameter2;
                listener = parameter1;
            }
            
            if (typeof event !== "string" && typeof event !== "number") {
                throw new Error("Event names can only be strings or numbers! event: ", event);
            }
            
            if (typeof listener !== "function") {
                throw new Error("Only functions may be used as listeners!");
            }
            
            event = event || '*';
            
            this.callbacks[event] = this.callbacks[event] || [];
            this.callbacks[event].push(listener);
            
            this.trigger(
                "EventBus.subscribe", 
                {
                    listener: listener,
                    event: event,
                    bus: this
                }
            );
            
            return function unsubscriber () {
                self.unsubscribe(listener, event);
            };
        };
        
        DataBus.prototype.unsubscribe = function(parameter1, parameter2) {
            
            var cbs, len, i, listener, event;
            
            if (parameter2 === undefined) {
                event = "*";
                listener = parameter1;
            }
            else if (typeof parameter1 === "string" || typeof parameter1 === "number") {
                event = parameter1;
                listener = parameter2;
            }
            else if (typeof parameter2 === "string" || typeof parameter2 === "number") {
                event = parameter2;
                listener = parameter1;
            }
            
            if (typeof event !== "string" && typeof event !== "number") {
                throw new Error("Event names can only be strings or numbers! event: ", event);
            }
            
            if (typeof listener !== "function") {
                throw new Error("Only functions may be used as listeners!");
            }
            
            event = event || '*';
            cbs = this.callbacks[event] || [];
            len = cbs.length;
            
            for (i = 0; i < len; ++i) {
                if (cbs[i] === listener) {
                    this.callbacks[event].splice(i, 1);
                }
            }
            
            this.trigger(
                "EventBus.unsubscribe", 
                {
                    listener: listener,
                    event: event,
                    bus: this
                }
            );
        };
        
        DataBus.prototype.once = function (listenerOrEvent1, listenerOrEvent2) {
            
            var fn, self = this, event, listener;
            var firstParamIsFunction, secondParamIsFunction, called = false;
            
            firstParamIsFunction = typeof listenerOrEvent1 === "function";
            secondParamIsFunction = typeof listenerOrEvent2 === "function";
            
            if ((firstParamIsFunction && secondParamIsFunction) || 
                    (!firstParamIsFunction && !secondParamIsFunction)) {
                throw new Error("Parameter mismatch; one parameter needs to be a function, " +
                    "the other one must be a string.");
            }
            
            if (firstParamIsFunction) {
                listener = listenerOrEvent1;
                event = listenerOrEvent2;
            }
            else {
                listener = listenerOrEvent2;
                event = listenerOrEvent1;
            }
            
            event = event || "*";
            
            fn = function (data, info) {
                
                if (called) {
                    return;
                }
                
                called = true;
                self.unsubscribe(fn, event);
                listener(data, info);
            };
            
            this.subscribe(fn, event);
        };
        
        DataBus.prototype.trigger = function(event, data, async) {
            
            var cbs, len, info, j, f, cur, self, flowType;
            
            if (
                typeof event !== "undefined" &&
                typeof event !== "string" &&
                typeof event !== "number"
            ) {
                throw new Error("Event names can only be strings or numbers! event: ", event);
            }
            
            self = this;
            event = arguments.length ? event : "*";
            
            flowType = (typeof async !== "undefined" && async === false) ?
                DataBus.FLOW_TYPE_SYNCHRONOUS :
                this.defaults.flowType;
            
            // get subscribers in all relevant namespaces
            cbs = (function() {
                
                var n, words, wc, matches, k, kc, old = "", out = [];
                
                // split event name into namespaces and get all subscribers
                words = event.split(".");
                
                for (n = 0, wc = words.length ; n < wc ; ++n) {
                    
                    old = old + (n > 0 ? "." : "") + words[n];
                    matches = self.callbacks[old] || [];
                    
                    for (k = 0, kc = matches.length; k < kc; ++k) {
                        out.push(matches[k]);
                    }
                }
                
                if (event === "*") {
                    return out;
                }
                
                // get subscribers for "*" and add them, too
                matches = self.callbacks["*"] || [];
                
                for (k = 0, kc = matches.length ; k < kc ; ++k) {
                    out.push( matches[ k ] );
                }
                
                return out;
            }());
            
            len = cbs.length;
            
            info = {
                event: event,
                subscribers: len,
                async: flowType === DataBus.FLOW_TYPE_ASYNCHRONOUS ? true : false,
                getQueueLength: function() {
                    
                    if (len === 0) {
                        return 0;
                    }
                    
                    return len - (j + 1);
                }
            };
            
            function asyncThrow (e) {
                setTimeout(
                    function () {
                        throw e;
                    },
                    0
                );
            }
            
            // function for iterating through the list of relevant listeners
            f = function() {
                
                if (self.log === true) {
                    console.log( 
                        "EventBus event triggered: " + event + "; Subscribers: " + len, 
                        self.logData === true ? "; Data: " + data : "" 
                    );
                }
                
                for (j = 0; j < len; ++j) {
                    
                    cur = cbs[j];
                    
                    try {
                        cur(data, info);
                    }
                    catch (e) {
                        
                        console.log(e);
                        
                        self.trigger(
                            "EventBus.error", 
                            {
                                error: e,
                                info: info
                            }
                        );
                        
                        if (self.interceptErrors !== true) {
                            asyncThrow(e);
                        }
                    }
                }
            };
            
            if (flowType === DataBus.FLOW_TYPE_ASYNCHRONOUS) {
                setTimeout(f, 0);
            }
            else {
                f();
            }
        };
        
        DataBus.prototype.triggerSync = function (event, data) {
            return this.trigger(event, data, false);
        };
        
        DataBus.prototype.triggerAsync = function (event, data) {
            return this.trigger(event, data, true);
        };
        
        DataBus.inject = function (obj, args) {
            
            args = args || {};
            
            var squid = new DataBus(args);
            
            obj.subscribe = function (listener, event) {
                squid.subscribe(listener, event);
            };
            
            obj.unsubscribe = function (listener, event) {
                squid.unsubscribe(listener, event);
            };
            
            obj.once = function (listener, event) {
                squid.once(listener, event);
            };
            
            obj.trigger = function (event, data, async) {
                async = (typeof async !== "undefined" && async === false) ? false : true;
                squid.trigger(event, data, async);
            };
            
            obj.triggerSync = squid.triggerSync.bind(squid);
            obj.triggerAsync = squid.triggerAsync.bind(squid);
            
            obj.subscribe("destroyed", function () {
                squid.callbacks = [];
            });
        };
        
        return DataBus;
        
    }
}());
