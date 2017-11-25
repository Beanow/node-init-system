'use strict';

const Future = require('fluture');
const {convergeMap} = require('./future');

const bitwiseExitCodes = rets => rets.reduce((acc, val) => acc | val, 0);

const encaseDo = function*(itt) {
	let state, x;
	do {
		try{
			state = itt.next(x);
			if(!state.done) {
				x = yield state.value;
			} else {
				return state.value;
			}
		} catch(e) {
			yield Future.reject(e);
		}
	} while(!state.done);
	throw new Error('Implementation error in encaseDo, should return before end');
};

const makeServiceAction = (spec, nexts, reducer) => services =>
	Future.do(() => encaseDo(spec.service(
		services,
		impl => Future.parallel(
			Infinity,
			nexts.map(n => n(impl))
		)
		.map(reducer)
	)));

exports.runDAG = dag => {
	let starter;
	const cms = {};
	const nexts = {};
	nexts[dag.root] = [_ => Future.reject(new Error('No terminating service defined'))];

	// Depth first walker.
	const dfw = key => {
		const v = dag.get(key);
		const ns = Object.values(nexts[key]);
		if(!ns) {
			throw new Error(`Missing nexts for ${key}`);
		}
		if(!cms[key]) {
			cms[key] = convergeMap(v.after);
		}

		for(const e of v.after) {
			if(!nexts[e]) {
				nexts[e] = {};
			}
			if(!nexts[e][key]) {
				// Use a map to handle duplicate paths.
				nexts[e][key] = cms[key].converge(e);
			}
			dfw(e);
		}

		if (ns.length >= v.before.length) {
			const action = makeServiceAction(v, ns, bitwiseExitCodes);
			if(v.after.length === 0) {
				starter = action;
			}
			cms[key].action(action);
		}
	};

	dfw(dag.root);

	return starter({});
};
