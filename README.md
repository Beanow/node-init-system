# init-system

Declarative startup/shutdown for your Node.js apps.

This solution has a familiar syntax inspired by Linux startup systems.


```js
// services/my-service.js

module.exports = {

	// Declare the name of your service up front.
	provides: 'my-service',

	// Require our service is initialized after:
	after: ['config', 'database'],

	// Require our service is initialized before:
	before: ['http'],

	// The startup and shutdown logic.
	service: function*(services, provide){

		// Your logic to create the service.
		const myService = new MyService(services.config, services.database);

		// Let init-system know it's ready.
		const result = yield provide(myService);

		// Do our shutdown logic.
		myService.close();

		// Pass on a result (like an exit code).
		return result;
	}

};


// index.js

const init = require('init-system');

init.services(

	// Ordering is done in the service descriptions,
	// so we can simply glob our service files like this.
	init.glob('./services/*.js'),

	function(err, result){
		if(err){
			// There was a fatal error during setup or shutdown.
		} else {
			console.log(`Application exitted with ${result}`);
		}
	}

);
```
