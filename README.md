# databus

Simple data bus pattern implementation in JavaScript.

## Installation

    npm install databus

## Usage

```javascript
    var DataBus = require("databus");
    var bus = new DataBus();
    
    bus.subscribe("userEvents.loginAttempt", function (data) {
        console.log("The following user just logged in:", data.user);
    });
    
    bus.subscribe("userEvents", function (data) {
        console.log("A user event occured. Data:", data);
    });
    
    bus.trigger("userEvents.loginAttempt", {user: "johndoe"});
    // The following user just logged in: johndoe
    // A user event occured. Data: {user: "johndoe"}
```
