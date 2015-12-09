'use strict';

let assert = require('assert');
let entwine = require('..');

describe('system', () => {
  let started = [];
  let stopped = [];

  beforeEach(() => {
    started.length = 0;
    stopped.length = 0;
  });

  function component() {
    return class extends entwine.component.apply(this, arguments) {
      start() {
        started.push(this.constructor.name);
        return super.start();
      }
      stop() {
        stopped.push(this.constructor.name);
        return super.stop();
      }
    };
  }

  class ComponentA extends component({c:null}) {}
  class ComponentB extends component({a: null, c: null}) {}
  class ComponentC extends component({}) {}

  let components = {
    a: new ComponentA(),
    b: new ComponentB(),
    c: new ComponentC()
  };

  it('should detect unknown components and throw an error', () => {
    assert.throws(() => {
      entwine.system(components, {
        a: ['d', 'c'],
        b: ['a', 'c']
      });
    }, /Unknown component/);
  });

  it('should detect cyclical dependencies and throw an error', () => {
    assert.throws(() => {
      entwine.system(components, {
        a: ['b', 'c'],
        b: ['a', 'c']
      });
    }, /Cycle detected/);
  });

  it('should start and stop components in dependency order', () => {
    return entwine.system(components, {
      a: ['c'],
      b: ['a', 'c']
    })
      .start()
      .then(s => {
        assert.deepEqual(started, [
          'ComponentC',
          'ComponentA',
          'ComponentB'
        ]);

        return s.stop();
      }).then(s => {
        assert.deepEqual(stopped, [
          'ComponentB',
          'ComponentA',
          'ComponentC'
        ]);

        return s;
      });
  });

  it('should allow mapping dependencies with different names', () => {
    class ComponentA extends component({c:null}) {}
    class ComponentB extends component({a: null, cc: null}) {}
    class ComponentC extends component({}) {}

    let components = {
      a: new ComponentA(),
      b: new ComponentB(),
      c: new ComponentC()
    };

    return entwine.system(components, {
      a: ['c'],
      b: {
        a: 'a',
        c: 'cc'
      }
    })
      .start()
      .then(s => {
        assert.deepEqual(started, [
          'ComponentC',
          'ComponentA',
          'ComponentB'
        ]);

        return s.stop();
      }).then(s => {
        assert.deepEqual(stopped, [
          'ComponentB',
          'ComponentA',
          'ComponentC'
        ]);

        return s;
      });
  });
});
