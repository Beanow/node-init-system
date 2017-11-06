'use strict';

const {DagTable} = require('./models');

// Mockeroonies for lunch.
exports.createDAG = modules => {
	const services = modules.reduce(
		(acc, n) => Object.assign(
			acc,
			{[n.provides]: {key: n.provides, value: n}}
		),
		{}
	);

	return ([
		[services.config],
		[services.mongo, services.redis],
		[services.http],
		[services.signals]
	]);
};
