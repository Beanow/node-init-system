'use strict';

const Future = require('fluture');

exports.convergeGroup = (size, convergeAction) => {
	const inputs = [];
	const waiting = [];

	// Unfortunate blerg to deal with sync vs async situations.
	let pruneResolve, pruneValue;
	const resolveOutput = v => pruneResolve ? pruneResolve(v) || v : pruneValue = v;
	const prunePath = Future.cache(Future((_, resolve) => {
		pruneValue ? resolve(pruneValue) : pruneResolve = resolve;
	}));

	return input => Future((reject, resolve) => {
		inputs.push(input);
		waiting.push(waiting.length > 0 ? reject : resolve);

		if(waiting.length >= size) {
			for(const resolveInstance of waiting) {
				resolveInstance(resolveOutput);
			}
		}
	})
	.chain(resolve => convergeAction(inputs, resolve))
	.chainRej(_ => prunePath);
};
