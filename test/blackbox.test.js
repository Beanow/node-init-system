'use strict';

const {expect} = require('chai');
const init = require('../src');
const {spec, provideSync, provideAfter, terminateSync, terminateAfter} = require('./services.mock');

describe('blackbox', _ => {
	const options = {
		// logger: console.log
	};

	describe('init.services', _ => {
		it('resolves without options', done => {
			const services = [
				spec(terminateSync(42), 'A')
			];

			init.services(
				services,
				(err, result) => {
					expect(err).to.equal(null);
					expect(result).to.equal(42);
					done();
				}
			);
		});

		it('resolves a synchronous service DAG', done => {
			const services = [
				spec(provideSync, 'A'),
				spec(provideSync, 'B', 'A'),
				spec(terminateSync(123), 'C', 'B')
			];

			init.services(
				services,
				options,
				(err, result) => {
					expect(err).to.equal(null);
					expect(result).to.equal(123);
					done();
				}
			);
		});

		it('resolves an asynchronous service DAG', done => {
			const services = [
				spec(provideAfter(20), 'A'),
				spec(provideAfter(10), 'B', 'A'),
				spec(terminateAfter(5, 456), 'C', 'B')
			];

			init.services(
				services,
				options,
				(err, result) => {
					expect(err).to.equal(null);
					expect(result).to.equal(456);
					done();
				}
			);
		});

		it('detects a self-dependency', done => {
			const services = [
				spec(terminateSync(0), 'A', 'A')
			];

			init.services(
				services,
				options,
				(err, result) => {
					expect(err.message).to.have.string('Service has a dependency to itself:');
					expect(err.message).to.match(/:.*A/);
					expect(result).to.be.undefined;
					done();
				}
			);
		});

		it('detects multiple self-dependencies', done => {
			const services = [
				spec(terminateSync(0), 'A', 'A'),
				spec(terminateSync(0), 'B', 'B'),
			];

			init.services(
				services,
				options,
				(err, result) => {
					expect(err.message).to.have.string('Services having a dependency to themselves');
					expect(err.message).to.match(/:.*A/);
					expect(err.message).to.match(/:.*B/);
					expect(result).to.be.undefined;
					done();
				}
			);
		});

		it('detects a circular dependency', done => {
			const services = [
				spec(provideSync, 'A', 'B'),
				spec(terminateSync(0), 'B', 'A')
			];

			init.services(
				services,
				options,
				(err, result) => {
					expect(err.message).to.have.string('Found circular dependency');
					expect(err.message).to.have.string('A => B');
					expect(result).to.be.undefined;
					done();
				}
			);
		});

		it('detects multiple circular dependencies', done => {
			const services = [
				spec(provideSync, 'A', 'B'),
				spec(provideSync, 'B', 'A'),
				spec(provideSync, 'C', 'D'),
				spec(terminateSync(0), 'D', 'C')
			];

			init.services(
				services,
				options,
				(err, result) => {
					expect(err.message).to.have.string('Found circular dependencies');
					expect(err.message).to.have.string('A => B');
					expect(err.message).to.have.string('C => D');
					expect(result).to.be.undefined;
					done();
				}
			);
		});

		it('does not freeze on falsy synchronous terminates', done => {
			const services = [
				spec(provideSync, 'A'),
				spec(terminateSync(false), 'B', 'A')
			];

			init.services(
				services,
				options,
				(err, result) => {
					expect(err).to.equal(null);
					expect(result).to.equal(0);
					done();
				}
			);
		});

		it('does not freeze on undefined synchronous terminates', done => {
			const services = [
				spec(provideSync, 'A'),
				spec(terminateSync(undefined), 'B', 'A')
			];

			init.services(
				services,
				options,
				(err, result) => {
					expect(err).to.equal(null);
					expect(result).to.equal(0);
					done();
				}
			);
		});
	});

});
