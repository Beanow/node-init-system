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
				spec(provideAfter(15), 'A'),
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

		it('resolves a converge DAG', function(done) {

			// Should take ~55ms to resolve all layers in parallel.
			this.timeout(100);

			const services = [
				spec(provideAfter(50), 'A1'),
				spec(provideAfter(48), 'A2'),
				spec(provideAfter(45), 'A3'),
				spec(provideAfter(42), 'A4'),
				spec(terminateAfter(5, 1337), 'B', 'A1 A2 A3 A4')
			];

			init.services(
				services,
				options,
				(err, result) => {
					expect(err).to.equal(null);
					expect(result).to.equal(1337);
					done();
				}
			);
		});

		it('resolves a parallel and converge DAG', function(done) {

			// Should take ~85ms to resolve all layers in parallel.
			this.timeout(120);

			const services = [
				spec(provideAfter(5), 'A'),
				spec(provideAfter(25), 'B1', 'A'),
				spec(provideAfter(24), 'B2', 'A'),
				spec(provideAfter(25), 'C1', 'B1'),
				spec(provideAfter(24), 'C2', 'B1'),
				spec(provideAfter(23), 'C3', 'B2'),
				spec(provideAfter(22), 'C4', 'B2'),
				spec(provideAfter(25), 'D1', 'C1 C2'),
				spec(provideAfter(24), 'D2', 'C3 C4'),
				spec(terminateAfter(5, 1337), 'E', 'D1 D2')
			];

			init.services(
				services,
				options,
				(err, result) => {
					expect(err).to.equal(null);
					expect(result).to.equal(1337);
					done();
				}
			);
		});

		it('executes fast in parallel', function(done) {

			// Should take ~65ms to resolve all layers in parallel.
			this.timeout(100);

			const layers = ['A', 'B', 'C'];
			const width = 5;
			const nameFor = (l, i) => `${l}${i}`;
			const depFor = (l, i) => {
				switch(l) {
				case 'C': return nameFor('B', i);
				case 'B': return nameFor('A', i);
				default: return '';
				}
			};

			const services = [];
			const rootDeps = [];

			for(let i = 1; i <= width; i++) {
				rootDeps.push(nameFor('C', i));
				for(const l of layers) {
					services.push(
						spec(provideAfter(20), nameFor(l, i), depFor(l, i))
					);
				}
			}

			services.push(spec(
				terminateAfter(5, 678),
				'Terminator',
				rootDeps.join(' ')
			));

			init.services(
				services,
				options,
				(err, result) => {
					expect(err).to.equal(null);
					expect(result).to.equal(678);
					done();
				}
			);
		});

		it('detects multiple DAG roots', done => {
			const services = [
				spec(terminateSync(0), 'A'),
				spec(terminateSync(0), 'B')
			];

			init.services(
				services,
				options,
				(err, result) => {
					expect(err.message).to.have.string('Must have exactly 1 root, actually:');
					expect(err.message).to.match(/:.*A/);
					expect(err.message).to.match(/:.*B/);
					expect(result).to.be.undefined;
					done();
				}
			);
		});

		it('detects an unknown dependency', done => {
			const services = [
				spec(terminateSync(0), 'A', 'UndefinedB')
			];

			init.services(
				services,
				options,
				(err, result) => {
					expect(err.message).to.have.string('Unknown dependencies found');
					expect(err.message).to.have.string('in A [UndefinedB]');
					expect(result).to.be.undefined;
					done();
				}
			);
		});

		it('detects multiple unknown dependencies', done => {
			const services = [
				spec(provideSync, 'A', 'B UndefinedC'),
				spec(terminateSync(0), 'B', 'UndefinedD'),
			];

			init.services(
				services,
				options,
				(err, result) => {
					expect(err.message).to.have.string('Unknown dependencies found');
					expect(err.message).to.have.string('in A [UndefinedC]');
					expect(err.message).to.have.string('in B [UndefinedD]');
					expect(result).to.be.undefined;
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
					expect(err.message).to.have
					.string('Services having a dependency to themselves');
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
