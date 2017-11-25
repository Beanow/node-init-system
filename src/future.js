'use strict';

const Future = require('fluture');

// Unfortunate blerg to deal with sync vs async situations.
const createCache = () => {
	let cacheResolve, cacheResolveValue, cacheReject, cacheRejectValue;
	const resolveCache = v => cacheResolve ? cacheResolve(v) || v : cacheResolveValue = v;
	const rejectCache = v => cacheReject ? cacheReject(v) || v : cacheRejectValue = v;
	const cache = Future.cache(Future((reject, resolve) => {
		if(cacheResolveValue || cacheRejectValue) {
			if(cacheRejectValue) {
				reject(cacheRejectValue);
			} else {
				resolve(cacheResolveValue);
			}
		}

		cacheReject = reject;
		cacheResolve = resolve;
	}));

	return {cache, rejectCache, resolveCache};
};

/**
 * Creates a converge map based on a given set of keys and an action.
 * Arguments:
 * - keys: String[]
 * - action: map => Future a b
 * Returns:
 *   key => value => Future a b
 *
 * The flow of a convergeMap is:
 * 1. Every key in the set receives a value.
 * 2. The action is called **only once** with the map containing all values.
 * 3. The Future returned by the action is forked.
 * 4. It's reject / resolve value is copied to all Futures the convergeMap returned.
 */
exports.convergeMap = (keys, action) => {
	const remaining = new Set(keys);
	const map = keys.reduce((acc, val) => Object.assign(acc, {[val]: null}), {});
	const {cache, rejectCache, resolveCache} = createCache();

	let completed = false;
	const onSetCompleted = m => {
		completed = true;
		action(m).fork(rejectCache, resolveCache);
	};

	return key => {
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
	};
};
