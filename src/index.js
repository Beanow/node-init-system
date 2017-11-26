'use strict';

const Future = require('fluture');
const {Modules: validateModules} = require('./models');
const {createDAG} = require('./dag');
const {runDAG} = require('./run');

const defaultOpts = {
	logger: _ => {}
};

// exports.glob = _ => require('../test');

exports.services = (modules, opts, cb) => {
	let options, callback;
	if(cb) {
		options = Object.assign({}, {...defaultOpts, ...opts});
		callback = cb;
	} else {
		options = Object.assign({}, defaultOpts);
		callback = opts;
	}

	Future.of(modules)
	.map(validateModules)
	.chain(createDAG(options))
	.chain(runDAG(options))
	.done(callback);
};
