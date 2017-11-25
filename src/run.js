'use strict';

const Future = require('fluture');
const {convergeMap} = require('./future');

const bitwiseExitCodes = rets => rets.reduce((acc, val) => acc | val, 0);

const buildProvide = (newServices, numAfters, next, reducer) => currentServices => {
	const serviceNames = newServices.map(s => s.provides);
	const converge = convergeMap(serviceNames, next);

	return Future.parallel(
		Infinity,
		newServices.map(s =>
			Future.do(() => s.service(
				currentServices,
				converge(s.provides)
			))
		)
	)
	.map(reducer);
};

exports.runDAG = table => {
	let provide = _ => Future.reject(new Error('No terminating service'));

	for(let i = table.length - 1; i >= 0; i--) {
		provide = buildProvide(
			table[i].map(n => n.value),
			i > 0 ? table[i - 1].length : 0,
			provide,
			bitwiseExitCodes
		);
	}

	return provide({});
};
