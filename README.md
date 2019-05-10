# init-system

[![NPM Version](https://badge.fury.io/js/init-system.svg)](https://www.npmjs.com/package/init-system)
[![Dependencies](https://david-dm.org/Beanow/node-init-system.svg)](https://david-dm.org/Beanow/node-init-system)
[![Build Status](https://travis-ci.org/Beanow/node-init-system.svg?branch=master)](https://travis-ci.org/Beanow/node-init-system)
[![Code Coverage](https://codecov.io/gh/Beanow/node-init-system/branch/master/graph/badge.svg)](https://codecov.io/gh/Beanow/node-init-system)

Declarative startup/shutdown for your Node.js apps.

This solution has a dependency declarations similar to Linux startup systems or Makefiles.
It also has inversion of control similar to middleware.

## Project status

**Unmaintained**

This module saw sucessful deployments into production for projects I worked on,
but we eventually decided to move to [booture](https://github.com/fluture-js/booture).
The functionality and syntax are similar, but it offers cleaner integration into Fluture and well defined behaviour since it's based on Fluture Hooks.

## Usage

First we need to declare our services.

```js
// services/my-service.js

module.exports = {

	// The name of this service.
	provides: 'myService',

	// The dependencies of this service.
	after: ['config', 'database'],

	/*
		Below is the startup and shutdown logic.

		services: object
			This object holds all of the dependencies
			declared in "after".

		provide: function(value) => Future
			A function you need to call to signal
			your service is created and ready for use.
	*/
	service: function*(services, provide) {

		// Use your dependencies.
		const myService = new MyService(services.config, services.database);

		// Let init-system know the service is ready.
		const exitCode = yield provide(myService);

		// Do our shutdown logic.
		myService.close();

		// Pass on the exit code.
		return exitCode;
	}

};
```

Then in our main script, load them using `init-system`.

```js
// index.js

const init = require('init-system');

init.services(

	// Ordering is done in the service descriptions,
	// so we can simply provide an unsorted array.
	[
		require('./services/config.js'),
		require('./services/my-service.js'),
		require('./services/database.js')
	],

	// Node callback.
	function(err, exitCode){
		if(err){
			console.error(`Error during application startup / shutdown: ${err}`);
		} else {
			console.log(`Application exitted with ${exitCode}`);
		}
	}

);
```

</details>

### Available options

You can call `init.services(services, [options], callback)` with an options object to change some behavior.

key | type | description
-|-|-
logger | `function(message)` | Allows you to set a logger for verbose startup / shutdown messages.

<details><summary><strong>View example usage for the options</strong></summary>

```js
const options = {

	// Sets a logger for verbose startup / shutdown messages.
	logger: function(message) {
		console.log('init-system', message);
	}

};

init.services(
	[/* services */],
	options,
	function(err, exitCode) { /* callback */ }
);
```

</details>
