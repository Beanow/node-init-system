'use strict';

const Future = require('fluture');

const tarjan = exports.tarjan = vertexes => {
	let index = 0;
	const stack = [],
		visited = {},
		results = [];

	const dfs = v => {
		const entry = visited[v] = {
			onStack: true,
			lowlink: index,
			index: index++
		};
		stack.push(v);

		for(const w of vertexes[v].before) {
			if (!visited[w]) {
				dfs(w);
				entry.lowlink = Math.min(entry.lowlink, visited[w].lowlink);
			} else if (visited[w].onStack) {
				entry.lowlink = Math.min(entry.lowlink, visited[w].index);
			}
		}

		if (entry.lowlink === entry.index) {
			const cmpt = [];
			let w;
			do {
				w = stack.pop();
				visited[w].onStack = false;
				cmpt.push(w);
			} while (v !== w);
			results.push(cmpt);
		}
	};

	for(const v in vertexes) {
		if (!visited[v]) {
			dfs(v);
		}
	}

	return results;
};

// Silently removes duplicate values.
const uniqueValues = arr =>
	Object.keys(
		arr.reduce((acc, val) => {
			acc[val] = true;
			return acc;
		}, {})
	);

const toVertexMap = services =>
	services
	.map(s => ({...s, after: uniqueValues(s.after || []), before: []}))
	.reduce((acc, s) => Object.assign(acc, {[s.provides]: s}), {});

// Map afters to befores. Tracking obviously broken dependencies.
const scanDependencies = vertexes => {
	const unknowns = {};
	const selfDependent = [];

	for(const v in vertexes) {
		const to = vertexes[v];
		for(const e of to.after) {
			const from = vertexes[e];
			if(e === v) {
				selfDependent.push(v);
			}

			if(!from) {
				unknowns[v] = (unknowns[v] || []);
				unknowns[v].push(e);
			} else {
				from.before.push(v);
			}
		}
	}

	return {unknowns, selfDependent};
};

exports.createDAG = services => {
	const vertexes = toVertexMap(services);
	const {unknowns, selfDependent} = scanDependencies(vertexes);

	// Unknown dependencies fails early.
	const us = Object.keys(unknowns);
	if(us.length) {
		const string = us.map(u => `in ${u} [${unknowns[u].join(', ')}]`).join(', ');
		return Future.reject(new Error(`Unknown dependencies found ${string}`));
	}

	// Self dependendent fails early.
	if(selfDependent.length) {
		const pluralize = selfDependent.length === 1 ? 'Service has' : 'Services having';
		return Future.reject(new Error(`${pluralize} a dependency to itself: ${selfDependent}`));
	}

	// Find cycles between services.
	const stronglyConnected = tarjan(vertexes);
	const cycles = stronglyConnected.filter(c => c.length > 1);
	if(cycles.length > 0) {
		const pluralize = cycles.length === 1 ? 'dependency' : 'dependencies';
		const strings = cycles.map(c => {
			c.push(c[0]);
			return `[${c.join(' => ')}]`;
		});

		return Future.reject(new Error(`Found circular ${pluralize}:\n\t${strings.join('\n\t')}`));
	}

	// Find the root service.
	const roots = Object.keys(vertexes).filter(v => (vertexes[v].before || []).length === 0);
	if(roots.length !== 1) {
		return Future.reject(new Error(`Must have exactly 1 root, actually: ${roots}`));
	}

	// Find the source service(s).
	const sources = Object.keys(vertexes).filter(v => (vertexes[v].after || []).length === 0);
	if(sources.length < 1) {
		return Future.reject(new Error(`Must have at least 1 source, actually: ${sources}`));
	}

	// Share our DAG.
	return Future.of({
		sources,
		vertexes,
		root: roots[0],
		get: v => vertexes[v]
	});
};
