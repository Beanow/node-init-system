'use strict';

const Future = require('fluture');

const service = exports.service = name => ({svc: name});

exports.provideAfter = after => name =>
	function*(_, provide) {
		const impl = service(name);
		const svc = yield Future.after(after, impl);
		const ret = yield provide(svc);
		return ret;
	};

exports.provideSync = name =>
	function*(_, provide) {
		const impl = service(name);
		const ret = yield provide(impl);
		return ret;
	};

exports.terminateAfter = (after, val) => _ =>
	function*() {
		const ret = yield Future.after(after, val);
		return ret;
	};

exports.terminateSync = val => _ =>
	function*() {
		const ret = val;
		return ret;
	};

exports.spec = (type, name, afterStr) => {
	const after = (afterStr || '').split(/[,\s]/).map(s => s.trim()).filter(s => s.length > 0);
	return {
		provides: name,
		after,
		service: type(name)
	};
};
