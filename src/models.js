'use strict';

const t = require('tcomb');

const Module = exports.Module = t.struct({
	provides: t.String,
	before: t.maybe(t.list(t.String)),
	after: t.maybe(t.list(t.String)),
	service: t.Function
}, 'Module');

exports.Modules = t.list(Module);

const DagNode = exports.DagNode = t.struct({
	key: t.String,
	value: t.Any
}, 'DagNode');

exports.DagTable = t.list(t.list(DagNode));
