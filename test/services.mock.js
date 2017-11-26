'use strict';

const Future = require('fluture');

const service = exports.service = name => ({svc: name});

const checkDeps = (deps, services) => {
	const available = new Set(Object.keys(services));
	const missing = deps.filter(d => !available.has(d));
	if(missing.length > 0) {
		throw new Error(`Service dependencies missing: [${missing}]`);
	}
};

exports.errorAfter = (after, err) => (name, deps) =>
	function*(services) {
		checkDeps(deps, services);
		throw yield Future.after(after, err);
	};

exports.provideAfterThenError = (after, err) => (name, deps) =>
	function*(services, provide) {
		checkDeps(deps, services);
		const impl = service(name);
		const svc = yield Future.after(after, impl);
		yield provide(svc);
		throw err;
	};

exports.provideAfter = after => (name, deps) =>
	function*(services, provide) {
		checkDeps(deps, services);
		const impl = service(name);
		const svc = yield Future.after(after, impl);
		const ret = yield provide(svc);
		return ret;
	};

exports.provideSync = (name, deps) =>
	function*(services, provide) {
		checkDeps(deps, services);
		const impl = service(name);
		const ret = yield provide(impl);
		return ret;
	};

exports.terminateAfter = (after, val) => (_, deps) =>
	function*(services) {
		checkDeps(deps, services);
		const ret = yield Future.after(after, val);
		return ret;
	};

exports.terminateSync = val => (_, deps) =>
	function*(services) {
		checkDeps(deps, services);
		const ret = val;
		return ret;
	};

exports.spec = (type, name, afterStr) => {
	const after = afterStr ? afterStr.split(/[,\s]/).filter(s => s.length > 0) : undefined;
	return {
		provides: name,
		after,
		service: type(name, after || [])
	};
};
