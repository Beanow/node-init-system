'use strict';

const Future = require('fluture');
const {Middleware} = require('momi');
const {convergeGroup} = require('./future');

const parallel = (max, reduceReturn, wares, convergeCount) =>
	Middleware(convergeGroup(convergeCount, (inputs, resolve) => {
		const state = inputs.reduce((acc, val) => Object.assign(acc, val), {});
		return Future.parallel(max, wares.map(w => w.run(state)))
		.map(ts => resolve({
			_1: reduceReturn(ts.map(t => t._1)),
			_2: null
		}));
	}));

const simpleOutputReducer = rets => rets[0] + 1;

const drainService = (spec, next) =>
	Middleware.get
	.chain(services => {
		let hasProvided = false;
		const provide = impl => {
			hasProvided = true;
			return impl;
		};

		const gen = spec.service(services, provide);

		const preDrain = x => {
			const itt = gen.next(x);
			return hasProvided ? Future.of(itt.value) : itt.value.chain(preDrain);
		};

		const postDrain = x => {
			const itt = gen.next(x);
			return itt.done ? Future.of(itt.value) : itt.value.chain(postDrain);
		};

		return Middleware.lift(preDrain())
		.chain(service => Middleware.put(Object.assign({}, services, {[spec.provides]: service})))
		.chain(_ => next)
		.chain(result => Middleware.lift(postDrain(result)));
	});

exports.runDAG = table => {
	const order = table.reverse();
	let next = Middleware.of(0);
	for(let i = 0; i < order.length; i++) {
		next = parallel(
			// Go fast or go home!
			Infinity,

			// How to handle multiple return values (like exit codes).
			simpleOutputReducer,

			// What to do with each service.
			order[i].map(node => drainService(node.value, next)),

			// Peek ahead to know the converge size.
			(order[i + 1] || []).length
		);
	}
	return next.evalState({});
};
