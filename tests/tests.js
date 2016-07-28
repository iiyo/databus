/* global require, describe, it */

var assert = require("assert");
var EventBus = require("../src/databus");

describe("EventBus", function () {
    
    describe(".prototype.subscribe(channel, listener)", function () {
        
        it("should subscribe a listener to listen for messages on a channel", function (done) {
            
            var bus = new EventBus();
            
            bus.subscribe("foo", function () {
                done();
            });
            
            bus.trigger("foo");
        });
        
        it("should work with any order of the arguments.", function (done) {
            
            var bus = new EventBus();
            
            bus.subscribe(function () {
                done();
            }, "foo");
            
            bus.trigger("foo");
        });
        
        it("shouldn't work with channel names other than strings or numbers.", function (done) {
            
            var bus = new EventBus();
            
            [null, undefined, ["bar"], {bar: "baz"}].forEach(function (value) {
                
                try {
                    
                    bus.subscribe(value, function () {
                        done(new Error("Channel names may only be strings or numbers."));
                    });
                    
                    bus.trigger(value);
                }
                catch (error) {}
            });
            
            done();
        });
        
    });
    
    
    describe(".prototype.unsubscribe(channel, listener)", function () {
        
        it("should unsubscribe a subscribed listener from a channel.", function (done) {
            
            var bus = new EventBus();
            var listenerCalled = false;
            
            function listener () {
                listenerCalled = true;
            }
            
            bus.subscribe("foo", listener);
            bus.unsubscribe("foo", listener);
            
            bus.trigger("foo", null, false);
            
            assert(!listenerCalled, "Listener should not be called after unsubscribing.");
            
            done();
        });
        
        it("should work with any order of the arguments.", function (done) {
            
            var bus = new EventBus();
            var listenerCalled = false;
            
            function listener () {
                listenerCalled = true;
            }
            
            bus.subscribe(listener, "foo");
            bus.unsubscribe(listener, "foo");
            
            bus.trigger("foo", null, false);
            
            assert(!listenerCalled, "Listener should not be called after unsubscribing.");
            
            done();
        });
        
    });
    
    
    describe(".prototype.trigger(channel, data, async)", function () {
        
        it("should cause all subscribed listeners on a channel to be executed.", function (done) {
            
            var bus = new EventBus();
            var numberOfListenersCalled = 0;
            var maxNumberOfListeners = 1000;
            var i;
            
            function makeListener () {
                return function () {
                    numberOfListenersCalled += 1;
                };
            }
            
            for (i = 0; i < 1000; i += 1) {
                bus.subscribe("foo", makeListener());
            }
            
            bus.trigger("foo", null, false);
            
            assert.equal(numberOfListenersCalled, maxNumberOfListeners);
            
            done();
        });
        
        it("should supply the listeners with the data used in the call.", function (done) {
            
            var bus = new EventBus();
            var data = {foo: "bar"};
            var numberOfListenersCalled = 0;
            var maxNumberOfListeners = 1000;
            var i;
            
            function makeListener () {
                return function (suppliedData) {
                    assert.equal(suppliedData, data);
                };
            }
            
            for (i = 0; i < 1000; i += 1) {
                bus.subscribe("foo", makeListener());
            }
            
            bus.trigger("foo", data, false);
            
            done();
        });
        
    });
    
});
