'use strict';

const Future = require('fluture');
const {expect} = require('chai');
const {convergeMap} = require('../src/future');

describe('future', _ => {

	describe('.convergeMap', _ => {
		it('forks the action only once', done => {
			const val = 'mock-value';
			const set = ['A', 'B', 'C'];
			const cm = convergeMap(set);

			let forkCount = 0;
			cm.setAction(input =>
				Future((_, resolve) => {
					forkCount++;
					resolve(input);
				})
			);

			let mapCount = 0;
			const fs = set.map(s =>
				cm.converge(s)(s).map(_ => {
					mapCount++;
					return val;
				})
			);

			Future.parallel(1, fs)
			.fork(
				err => expect(err).to.be.null,
				out => {
					expect(forkCount).to.equal(1);
					expect(mapCount).to.equal(3);
					expect(out.length).to.equal(3);
					expect(out[0]).to.equal(val);
					expect(out[1]).to.equal(val);
					expect(out[2]).to.equal(val);
					done();
				}
			);
		});

		it('passes reject values to all convergees', done => {
			const err = 'mock-error';
			const set = ['A', 'B', 'C'];
			const cm = convergeMap(set);

			let forkCount = 0;
			cm.setAction(_ =>
				Future(reject => {
					forkCount++;
					reject(err);
				})
			);

			let chainRejCount = 0;
			const fs = set.map(s =>
				cm.converge(s)(s).chainRej(e => {
					chainRejCount++;
					return Future.of(e);
				})
			);

			Future.parallel(1, fs)
			.fork(
				err => expect(err).to.be.null,
				out => {
					expect(forkCount).to.equal(1);
					expect(chainRejCount).to.equal(3);
					expect(out.length).to.equal(3);
					expect(out[0]).to.equal(err);
					expect(out[1]).to.equal(err);
					expect(out[2]).to.equal(err);
					done();
				}
			);
		});

		it('provides a hasAction method', done => {
			const set = ['A', 'B', 'C'];
			const cm = convergeMap(set);
			expect(typeof cm.hasAction).to.equal('function');
			expect(cm.hasAction()).to.be.false;
			cm.setAction(_ => Future.of('done'));
			expect(cm.hasAction()).to.be.true;
			done();
		});

		it('throws when the action is already set', done => {
			const set = ['A', 'B', 'C'];
			const cm = convergeMap(set);
			cm.setAction(_ => Future.of('done'));
			try{
				cm.setAction(_ => Future.of('done'));
			} catch(err) {
				expect(err.message).to.have.string('Action already set');
				done();
			}
		});

		it('throws when a converge key is not in the set', done => {
			const set = ['A', 'B', 'C'];
			const cm = convergeMap(set);
			try{
				cm.converge('D');
			} catch(err) {
				expect(err.message).to.have.string('Unexpected source for "D"');
				done();
			}
		});

		it('throws when no action is set before complete', done => {
			const val = 'mock-value';
			const set = ['A', 'B', 'C'];
			const cm = convergeMap(set);
			cm.converge('A')(val);
			cm.converge('B')(val);
			try{
				cm.converge('C')(val);
			} catch(err) {
				expect(err.message).to.have.string('Set completed but no action set');
				done();
			}
		});

		it('throws when a converge key already has a value', done => {
			const val = 'mock-value';
			const set = ['A', 'B', 'C'];
			const cm = convergeMap(set);
			cm.converge('A')(val);
			try{
				cm.converge('A');
			} catch(err) {
				expect(err.message).to.have.string('Duplicate source for "A"');
				done();
			}
		});

		it('throws when values are given after converging', done => {
			const val = 'mock-value';
			const set = ['A'];
			const cm = convergeMap(set);
			cm.setAction(_ => Future.of('done'));
			const c = cm.converge('A');
			c(val);
			try{
				c(val);
			} catch(err) {
				expect(err.message).to.have.string('Unexpected value for "A", already converged');
				done();
			}
		});
	});

});
