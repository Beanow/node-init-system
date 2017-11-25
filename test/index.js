'use strict';

const Future = require('fluture');

const dummyService = name => ({svc: name});
const dummyWithDeps = name => function*(services, provide) {
	console.log(`Running ${name} with ${JSON.stringify(Object.keys(services))}`);
	const result = yield provide(dummyService(name));
	console.log(`Done with ${name}: ${result}`);
	return result;
};

const dummyTerminator = name => function*(services, _) {
	console.log(`Running ${name} with ${JSON.stringify(Object.keys(services))}`);
	const result = yield Future.after(50, 0);
	console.log(`Done with ${name}: ${result}`);
	return result;
};

module.exports = [
	{
		provides: 'config',
		service: dummyWithDeps('config')
	},
	{
		provides: 'redis',
		after: ['config'],
		service: dummyWithDeps('redis')
	},
	{
		provides: 'mongo',
		after: ['config'],
		service: dummyWithDeps('mongo')
	},
	{
		provides: 'http',
		after: ['mongo', 'redis'],
		service: dummyWithDeps('http')
	},
	{
		provides: 'signals',
		after: ['http'],
		service: dummyTerminator('signals')
	}
];
