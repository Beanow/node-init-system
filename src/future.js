'use strict';

const Future = require('fluture');

// Unfortunate blerg to deal with sync vs async situations.
const createCache = () => {
	const fns = {};
	let syncOp = null;
	let syncVal;

	const set = op => v => {
		syncOp = op;
		fns[op] ? fns[op](v) : syncVal = v;
	};

	const cache = Future.cache(Future((reject, resolve) => {
		switch(syncOp) {
		case 'reject':
			reject(syncVal);
			break;
		case 'resolve':
			resolve(syncVal);
			break;
		default:
			fns.reject = reject;
			fns.resolve = resolve;
			break;
		}
	}));

	return {
		cache,
		rejectCache: set('reject'),
		resolveCache: set('resolve')
	};
};

/**
 * Creates a converge map based on a given set of keys and an action.
 * Arguments:
 * - keys: String[]
 * Returns:
 * - action: map => Future a b
 * - converge: key => value => Future a b
 *
 * The flow of a convergeMap is:
 * 1. Every key in the set receives a value.
 * 2. The action is called **only once** with the map containing all values.
 * 3. The Future returned by the action is forked.
 * 4. It's reject / resolve value is copied to all Futures the convergeMap returned.
 */
exports.convergeMap = keys => {
	const remaining = new Set(keys);
	const map = keys.reduce((acc, val) => Object.assign(acc, {[val]: null}), {});
	const {cache, rejectCache, resolveCache} = createCache();

	let action;
	let completed = false;
	const onSetCompleted = m => {
		completed = true;
		if(!action) {
			throw new Error('Set completed but no action set');
		}
		action(m).fork(rejectCache, resolveCache);
	};

	return {
		action: a => {
			if(action) {
				throw new Error('Action already set');
			}
			action = a;
		},
		converge: key => {
			if(!remaining.has(key)) {
				// For sake of clarity, determine if duplicate or unspecified.
				if(map[key] !== undefined) {
					throw new Error(`Duplicate source for "${key}".`);
				} else {
					throw new Error(`Unexpected source for "${key}".`);
				}
			}

			return val => {
				if(completed) {
					throw new Error('Unexpected source, already converged.');
				}
				map[key] = val;
				remaining.delete(key);

				if(remaining.size === 0) {
					onSetCompleted(map);
				}

				return cache;
			};
		}
	};
};
