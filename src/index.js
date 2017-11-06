'use strict';

const Future = require('fluture');
const {Modules: validateModules} = require('./models');
const {createDAG} = require('./dag');
const {runDAG} = require('./run');

exports.glob = _ => require('../test');

exports.services = (modules, callback) => {
	Future.of(modules)
	.map(validateModules)
	.map(createDAG)
	.chain(runDAG)
	.done(callback);
};

// Who needs a test framework?
exports.services(
	exports.glob('this is fake'),
	(err, result) => {
		if(err) {
			console.log(`Something bad! ${err.stack || err}`);
		} else {
			console.log(`Application exitted with ${result}`);
			console.log('--------');
		}
	}
);
