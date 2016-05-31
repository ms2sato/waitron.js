'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

;(function (global, factory) {
  /* eslint-disable no-undef */
  var me = factory(global);
  if ((typeof module === 'undefined' ? 'undefined' : _typeof(module)) === 'object' && module != null && module.exports) {
    module.exports = me;
  } else {
    global.w = me;
  }
  /* eslint-enable no-undef */
})(typeof window !== 'undefined' ? window : undefined, function (global, undefined) {
  /*global $ _ */
  function test() {}
  // utils ////////////////////////////////////////////////
  function log() {
    console.log.apply(console, arguments);
  }

  function _each(o, func) {
    if (Array.isArray(o)) {
      for (var i = 0; i < o.length; ++i) {
        func.call(o, o[i], i);
      }
      return o;
    }

    for (var key in o) {
      if (o.hasOwnProperty(key)) func.call(o, o[key], key);
    }
    return o;
  }

  // me ////////////////////////////////////////////////

  var Scope = function () {
    function Scope(el) {
      _classCallCheck(this, Scope);

      this.el = el;
    }

    _createClass(Scope, [{
      key: 'on',
      value: function on(eventName, listener) {
        if (arguments.length === 2) return addEventListener(this, eventName, listener);else return this.bind.apply(this, arguments);
      }
    }, {
      key: 'bind',
      value: function bind(selector, eventName, listener) {
        return addEventListener(this, eventName, listener, $(this.el).find(selector)[0]);
      }
    }, {
      key: 'render',
      value: function render() {
        var self = this;
        me.nextTick(function () {
          me.onBeforeRender.call(self);
          $(self.el).html(self.template(self));
          self.find('*[data-text]').each(function () {
            var key = $(this).data('text');
            $(this).text(self[key]);
          });

          self.find('*[data-list]').each(function () {
            var $list = $(this);
            var listName = $list.data('list');
            var list = self[listName];
            var $itemEl = $($(this).find('*')[0]);
            $itemEl.remove();

            list.each(function () {
              $itemEl.clone().appendTo($list);
            });
          });

          // FIXME: to addEventListener
          self.onRendered && decorateEventable(self, 'rendered', self.onRendered).call(self);

          me.onAfterRender.call(self);
        });
      }
    }, {
      key: 'sync',
      value: function sync(attr) {
        var self = this;
        var value = self.prop(attr);
        var $bind = this.find('*[data-text=' + attr + ']');
        if ($bind.size() === 0) return this.render();

        $bind.each(function () {
          $(this).text(value);
        });
      }
    }, {
      key: 'find',
      value: function find() {
        var $el = $(this.el);
        return $el.find.apply($el, arguments);
      }
    }, {
      key: 'prop',
      value: function prop(key) {
        var p = this[key];
        if (_.isFunction(p)) return p();
        return p;
      }
    }]);

    return Scope;
  }();

  var me = function waitron() {};

  me.defaultProperties = ['el', 'on', 'render', 'sync', 'find', 'prop'];

  if (global.setImmediate) {
    me.nextTick = function (func) {
      global.setImmediate(decorateEventable(null, 'tick', func));
    };
  } else {
    me.nextTick = function (func) {
      global.setTimeout(decorateEventable(null, 'tick', func), 0);
    };
  }

  me.onBeforeRender = function () {};
  me.onAfterRender = function () {
    var self = this;
    $(self.el).find('input[data-value]').each(function () {
      var $el = $(this);
      var key = $el.data('value');
      addEventListener(self, 'change', function () {
        self[key] = $el.val();
      });
      addEventListener(self, 'keyup', function () {
        self[key] = $el.val();
      });
    });
  };

  function onNewProperty(o, prop, newValue) {
    log('onNewProperty', arguments);
  }

  function onBeforePropertyChange(o, prop, value, newValue) {
    if (!(prop in o)) {
      onNewProperty(o, prop, newValue);
    }

    log('onBeforePropertyChange', arguments);
  }

  function onAfterPropertyChange(o, prop, value, oldValue) {
    log('onAfterPropertyChange', arguments);

    me.tickContext.push(o.id + '@' + prop, function () {
      o.update(prop);
    });
  }

  function onCollectionInserted(c, index, value) {
    log('onCollectionInserted', arguments);
  }

  function listenateProp(o, prop) {
    var value = o[prop];
    Object.defineProperty(o, prop, {
      get: function get() {
        return value;
      },
      set: function set(newValue) {
        var oldValue = value;
        onBeforePropertyChange(o, prop, value, newValue);
        value = newValue;
        onAfterPropertyChange(o, prop, value, oldValue);
      },

      enumerable: true,
      configurable: true
    });
  }

  // TODO: unenhance

  me.enhanceProperties = ['id', 'onChange', 'update'];

  var id_counter = 1;
  me.enhance = function enhance(o) {
    _each(o, function (value, key) {
      if (me.enhanceProperties.indexOf(key) !== -1) {
        throw new Error('Cannot enhance an object having property named ' + key + '!');
      }
    });

    if (o.__uniqueId === undefined) {
      // @see http://stackoverflow.com/questions/1997661/unique-object-identifier-in-javascript
      Object.defineProperty(o, '__uniqueId', {
        writable: true
      });

      o.__uniqueId = id_counter++;

      Object.defineProperty(o, 'id', {
        get: function get() {
          return this.__uniqueId;
        }
      });
    }

    Object.defineProperty(o, 'listeners', {
      writable: true,
      value: {},
      enumerable: false,
      configurable: true
    });
    _each(o, function (value, key) {
      if (me.defaultProperties.indexOf(key) !== -1) return;

      listenateProp(o, key);
      o.listeners[key] = []; // FIXME: 効率化
    });

    o.onChange = function (key, listener) {
      if (Array.isArray(key)) {
        _each(key, function (k) {
          o.listeners[k].push(listener);
        });
      } else {
        o.listeners[key].push(listener);
      }
    };

    o.update = function (attr) {
      if (attr) {
        return _each(o.listeners[attr], function (l) {
          l();
        });
      }

      return _each(o.listeners, function (listenerArr) {
        _each(listenerArr, function (l) {
          l();
        });
      });
    };

    return Object.keys(o.listeners);
  };

  var Observer = function () {
    function Observer() {
      _classCallCheck(this, Observer);

      this.listenersHash = {};
    }

    _createClass(Observer, [{
      key: 'on',
      value: function on(name, listener) {
        if (!this.listenersHash[name]) {
          this.listenersHash[name] = [];
        }
        this.listenersHash[name].push(listener);
      }
    }, {
      key: 'trigger',
      value: function trigger() {
        var name = arguments.shift();
        _each(this.listenersHash[name], function (listener) {
          listener.apply(this, arguments);
        });
      }
    }]);

    return Observer;
  }();

  me.Observer = Observer;

  var Collection = function (_Observer) {
    _inherits(Collection, _Observer);

    function Collection(models) {
      _classCallCheck(this, Collection);

      var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Collection).call(this));

      _this.models = models || [];
      return _this;
    }

    _createClass(Collection, [{
      key: 'push',
      value: function push(models) {}
    }, {
      key: 'at',
      value: function at(index) {}
    }, {
      key: 'shift',
      value: function shift() {}
    }, {
      key: 'unshift',
      value: function unshift() {}
    }, {
      key: 'pop',
      value: function pop() {}
    }, {
      key: 'insert',
      value: function insert(index, models) {
        var params = [index, 0];
        if (Array.isArray(models)) {
          params.push.apply(params, models);
        } else {
          params.push(models);
        }
        this.models.splice.apply(this.models, params);
        onCollectionInserted(this, index, models);
      }
    }, {
      key: 'remove',
      value: function remove(models) {}
    }, {
      key: 'clear',
      value: function clear() {}
    }, {
      key: 'reset',
      value: function reset(models) {}
    }, {
      key: 'sort',
      value: function sort(comparator) {}
    }, {
      key: 'swap',
      value: function swap(lindex, rindex) {}
    }, {
      key: 'each',
      value: function each(handler) {
        _each(this.models, handler);
      }
    }]);

    return Collection;
  }(Observer);

  me.Collection = Collection;

  // var c = new me.Collection([1, 2, 3])
  // c.insert(2, 4)

  // @see http://stackoverflow.com/questions/8403108/calling-eval-in-particular-context
  function evalInContext(js, context) {
    /* eslint-disable no-eval */
    return function () {
      /* eslint-disable no-unused-vars */
      var self = context;
      /* eslint-enable no-unused-vars */
      return eval(js);
    }.call(context);
    /* eslint-enable no-eval */
  }

  var decorateEventable = function decorateEventable(scope, eventName, listener) {
    return function (event) {
      try {
        me.onBeforeEvent(scope, eventName, event, listener);
        var ret = listener.call(scope, event);
        return me.onAfterEvent(scope, eventName, event, listener, ret);
      } catch (ex) {
        me.onEventError(ex);
      } finally {
        me.onEventFinally(scope, eventName, event, listener);
      }
    };
  };
  function addEventListener(scope, eventName, listener) {
    var el = arguments.length <= 3 || arguments[3] === undefined ? scope.el : arguments[3];

    if (el.addEventListener) {
      return el.addEventListener(eventName, decorateEventable(scope, eventName, listener), true);
    }
    if (el.attachEvent) {
      return el.attachEvent(eventName, decorateEventable(scope, eventName, listener));
    }
  }

  var TickContext = function () {
    function TickContext(scope, eventName, event, listener) {
      _classCallCheck(this, TickContext);

      this.scope = scope;
      this.eventName = eventName;
      this.event = event;
      this.listener = listener;
      this.queue = [];
    }

    _createClass(TickContext, [{
      key: 'execute',
      value: function execute() {
        // Q: Why unlimited loop ?
        // A: Because of pushing func to this.queue in queue process
        for (; this.queue.length > 0;) {
          this.queue.shift().call(this);
        }
      }
    }, {
      key: 'push',
      value: function push(key, func) {
        this.queue.push(func);
      }
    }, {
      key: 'clear',
      value: function clear() {
        this.queue.length = 0;
      }
    }]);

    return TickContext;
  }();

  me.onBeforeEvent = function (scope, eventName, event, listener) {
    me.tickContext = new TickContext(scope, eventName, event, listener);
  };

  me.onAfterEvent = function (scope, eventName, event, listener, ret) {
    log('onAfterEvent', eventName, event, listener, ret);
    me.tickContext.execute();
    return ret;
  };

  me.onEventError = function (ex) {
    log(ex, ex.stack);
    throw ex;
  };

  me.onEventFinally = function (scope, eventName, event, listener) {
    me.tickContext.clear();
  };

  var scriptsSelector = 'script[type="text/waitron"]';
  var scriptRegex = /<initialize>([\s\S]*)<\/initialize>/;
  var templateRegex = /<template>([\s\S]*)<\/template>/;
  function extractRegex(regex, text) {
    var m = regex.exec(text);
    return m[1]; // TODO:join?
  }

  var ComponentType = function () {
    var Component = function () {
      function Component(componentType) {
        _classCallCheck(this, Component);

        this.componentType = componentType;
      }

      _createClass(Component, [{
        key: 'init',
        value: function init() {
          var params = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
          var el = arguments.length <= 1 || arguments[1] === undefined ? document.createElement('div') : arguments[1];

          var templates = this.componentType.templates;
          var scope = new Scope(el);
          var defaultRenderingReject = this.componentType.bootstrap(scope, params);
          var attrs = me.enhance(scope);

          $(el).attr('data-id', scope.id);
          this.scope = scope;
          scope.template = _.template(templates);
          scope.render();

          if (defaultRenderingReject !== false) {
            _each(attrs, function (attr) {
              scope.onChange(attr, function onChangeListener() {
                scope.sync(attr);
              });
            });
          }

          return this;
        }
      }]);

      return Component;
    }();

    var ComponentType = function () {
      function ComponentType(scripts, templates, name) {
        _classCallCheck(this, ComponentType);

        this.scripts = scripts;

        if (_.isString(templates)) {
          this.templates = templates;
          this.name = name;
        } else {
          this.templates = $(templates).html();
          this.name = name || $(templates).attr('id');
        }

        ComponentType.list[this.name] = this;
      }

      _createClass(ComponentType, [{
        key: 'create',
        value: function create() {
          return new Component(this);
        }
      }, {
        key: 'createAfter',
        value: function createAfter(el, params) {
          var component = this.create();
          component.init(params);
          $(el).after(component.scope.el);
          return component;
        }
      }, {
        key: 'bootstrap',
        value: function bootstrap(scope, params) {
          if (typeof this.scripts === 'function') {
            return this.scripts.call(scope, params, scope);
          }
          evalInContext(this.scripts, scope);
        }
      }]);

      return ComponentType;
    }();

    ComponentType.list = {};

    ComponentType.createFromScript = function (shadows) {
      var scripts = extractRegex(scriptRegex, shadows);
      var templates = extractRegex(templateRegex, shadows);
      return new ComponentType(scripts, templates);
    };

    ComponentType.find = function (name) {
      return ComponentType.list[name];
    };

    return ComponentType;
  }();

  me.initFromScript = function (scriptEl) {
    var shadows = $(scriptEl).text();
    return ComponentType.createFromScript(shadows);
  };

  me.init = function () {
    $(scriptsSelector).each(function () {
      var componentType = me.initFromScript(this);

      componentType.createAfter(this);
    });
  };

  me.mount = function (el, handler) {
    return new ComponentType(handler, el);
  };

  me.find = function (name) {
    return ComponentType.find(name);
  };

  me.onBeforeEvent(null, 'bootstrap', null, null);
  // something on boot?
  me.onAfterEvent(null, 'bootstrap', null, null);

  return me;
});