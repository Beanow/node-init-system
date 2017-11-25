'use strict';

const t = require('tcomb');

const Module = exports.Module = t.struct({
	provides: t.String,
	after: t.maybe(t.list(t.String)),
	service: t.Function
}, 'Module');

exports.Modules = t.list(Module);
