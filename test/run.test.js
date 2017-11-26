'use strict';

const Future = require('fluture');
const {expect} = require('chai');
const {encaseDo} = require('../src/run');

const syncGen = val => {
	const gen = function*() { return val; };
	return gen();
};

const syncErrGen = err => {
	const gen = function*() { throw err; };
	return gen();
};

const afterGen = (after, val) => {
	const gen = function*() { return yield Future.after(after, val); };
	return gen();
};

const afterErrGen = (after, err) => {
	const gen = function*() { throw yield Future.after(after, err); };
	return gen();
};

describe('run', _ => {

	describe('.encaseDo', _ => {
		it('can chain sync', done => {
			Future.do(_ => encaseDo(syncGen(123)))
			.chain(val => {
				expect(val).to.equal(123);
				return Future.do(_ => encaseDo(syncGen(456)));
			})
			.fork(
				err => expect(err).to.equal(null),
				val => {
					expect(val).to.equal(456);
					done();
				}
			);
		});

		it('can chain async', done => {
			Future.do(_ => encaseDo(afterGen(20, 123)))
			.chain(val => {
				expect(val).to.equal(123);
				return Future.do(_ => encaseDo(afterGen(10, 456)));
			})
			.fork(
				err => expect(err).to.equal(null),
				val => {
					expect(val).to.equal(456);
					done();
				}
			);
		});

		it('can fail sync', done => {
			const err = 'mock error';

			Future.do(_ => encaseDo(syncErrGen(err)))
			.fork(
				err => {
					expect(err).to.equal(err);
					done();
				},
				val => {
					expect(val).to.equal(null);
				}
			);
		});

		it('can fail async', done => {
			const err = 'mock error';

			Future.do(_ => encaseDo(afterErrGen(10, err)))
			.fork(
				err => {
					expect(err).to.equal(err);
					done();
				},
				val => {
					expect(val).to.equal(null);
				}
			);
		});
	});

});
