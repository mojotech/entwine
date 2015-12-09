'use strict';

let _ = require('lodash');
let Promise = require('bluebird');
let Immutable = require('immutable');

function component() {
  return class extends Immutable.Record.apply(this, arguments) {
    start() {
      return Promise.resolve(this);
    }
    stop() {
      return Promise.resolve(this);
    }
  };
}

function validate(components, dependencies) {
  let visit = _.memoize((node, visited) => {
    if (!components[node]) {
      throw new Error('Unknown component: ' + node);
    } else {
      return _.every(dependencies[node] || {}, (v, k) => {
        if (visited.has(k)) {
          throw new Error('Cycle detected: ' + visited.add(node).join(' => ') + ' => ' + k);
        } else {
          return visit(k, visited.add(node));
        }
      });
    };
  });

  return _.every(components, (v, k) => visit(k, Immutable.OrderedSet()));
}

function normalizeDependencies(ds) {
  return _.mapValues(ds, v => _.isArray(v) ? _.zipObject(v, v) : v);
}

function invertDependencies(ds) {
  return _.merge.apply(
    _,
    _.map(ds, (v, k) => _.zipObject(_.map(v, (vv, kk) => [vv, {[k]: k}]))));
}

function postwalk(components, dependencies, f) {
  let visit = _.memoize((node) => {
    return Promise
      .props(_.mapValues(_.invert(dependencies[node] || {}), visit))
      .then(ds => f(components[node], ds, node));
  });

  return Promise.try(() => _.mapValues(components, (v, k) => visit(k))).props();
}

function prewalk(components, dependencies, f) {
  return postwalk(components, invertDependencies(dependencies), (c, ds, node) => f(c, dependencies[node], node));
}

class System extends component({
  components: Immutable.Map({}),
  dependencies: Immutable.Map({})
}) {
  start() {
    let self = this;

    return postwalk(
      this.components.toObject(),
      this.dependencies.toObject(),
      (c, ds, n) => c.merge(ds).start())
      .then(cs => self.set('components', Immutable.Map(cs)));
  }

  stop() {
    let self = this;

    return prewalk(
      this.components.toObject(),
      this.dependencies.toObject(),
      (c, ds) => {
        return c
          .stop()
          .then(c => _.reduce(ds, (c, d) => c.remove(d), c));
      }).then(cs => self.set('components', Immutable.Map(cs)));
  }
}

function system(components, dependencies) {
  let ds = normalizeDependencies(dependencies);

  if(validate(components, ds)) {
    return new System({
      components: Immutable.Map(components),
      dependencies: Immutable.Map(ds)
    });
  } else {
    throw new Error('Invalid system: ' + components + '\n' + dependencies);
  }
};

module.exports = {
  system: system,
  component: component
};
