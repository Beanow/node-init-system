'use strict';

const t = require('tcomb');

const Service = exports.Service = t.struct({
	provides: t.String,
	after: t.maybe(t.list(t.String)),
	service: t.Function
}, 'Service');

exports.Services = t.list(Service);
