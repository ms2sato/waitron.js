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
})(typeof window !== 'undefined' ? window : undefined, function (global) {
  /*global $ */

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
  var me = function waitron() {};

  function delegate(prototype, name, to) {
    if (Array.isArray(name)) {
      return _each(name, function (n) {
        delegate(prototype, n, to);
      });
    }

    prototype[name] = function () {
      this[to][name].apply(this[to], arguments);
    };
  }

  var identify = function () {
    var id_counter = 1;
    return function identify(o) {
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
    };
  }();

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
        var _this = this,
            _arguments = arguments;

        var name = Array.prototype.shift.call(arguments);
        _each(this.listenersHash[name], function (listener) {
          listener.apply(_this, _arguments);
        });
      }
    }]);

    return Observer;
  }();

  var Collection = function (_Observer) {
    _inherits(Collection, _Observer);

    function Collection(models) {
      _classCallCheck(this, Collection);

      var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(Collection).call(this));

      _this2.models = models || [];
      return _this2;
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

  // me ////////////////////////////////////////////////

  function listenate(o) {
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

    var ret = [];
    _each(o, function (value, key) {
      if (me.defaultProperties.indexOf(key) !== -1) return;

      listenateProp(o, key);
      ret.push(key);
    });
    return ret;
  }

  var Scope = function () {
    function Scope(params) {
      _classCallCheck(this, Scope);

      this.el = params.el;
      this.templates = params.templates;
      this.scripts = params.scripts;
      this.options = params.options;
      this.observer = new Observer();
      this.children = new Collection();

      identify(this);
    }

    _createClass(Scope, [{
      key: 'bootstrap',
      value: function bootstrap() {
        if (typeof this.scripts === 'function') {
          this.scripts(this.options, this);
        } else {
          evalInContext(this.scripts, this);
        }

        listenate(this);

        this.template = $(this.templates);
        this.doSetId();
        console.log(this.templates);

        this.scan();
        this.render();
      }
    }, {
      key: 'scanElm',
      value: function scanElm(el) {
        var _this3 = this;

        var scopeRegex = /\{([\s\S]*)\}/;
        var self = this;
        var $el = $(el);

        var text = $el.text();
        var m = scopeRegex.exec(text);
        if (m) {
          (function () {
            var ename = m[1];
            self.on(ename, function (e) {
              $el.text(self[ename]);
            });
            $el.text(self[ename]);
          })();
        }

        _each(el.attributes, function (val, key) {
          var name = val.nodeName;
          var m = scopeRegex.exec(val.textContent);
          if (m) {
            var _ret2 = function () {
              var key = m[1];
              if (name.substr(0, 2) === 'on') {
                addEventListener(_this3, name.substr(2), function (e) {
                  _this3[key](e);
                }, el);
                $(el).removeAttr(name);
              } else if (name === 'data-list') {
                var _ret3 = function () {
                  var list = _this3[key];
                  var $itemEl = $($el.children());
                  $itemEl.remove();

                  list.each(function (item) {
                    var scope = new FilledScope({
                      el: el,
                      templates: $itemEl.clone(),
                      scripts: function scripts() {
                        scope.$this = item;
                      },
                      options: {}
                    });
                    _this3.children.push(scope);
                    scope.bootstrap();
                  });
                  $el.removeAttr('data-list');
                  return {
                    v: {
                      v: void 0
                    }
                  };
                }();

                if ((typeof _ret3 === 'undefined' ? 'undefined' : _typeof(_ret3)) === "object") return _ret3.v;
              }
            }();

            if ((typeof _ret2 === 'undefined' ? 'undefined' : _typeof(_ret2)) === "object") return _ret2.v;
          }
        });

        $(el).children().each(function (i, el) {
          _this3.scanElm(el);
        });
      }
    }, {
      key: 'scan',
      value: function scan() {
        var _this4 = this;

        this.template.each(function (i, el) {
          _this4.scanElm(el);
        });
      }
    }, {
      key: 'render',
      value: function render() {
        var _this5 = this;

        var self = this;
        me.nextTick(function () {
          me.onBeforeRender.call(self);
          _this5.doRender();
          // FIXME: to addEventListener
          self.onRendered && decorateEventable(self, 'rendered', self.onRendered).call(self);

          me.onAfterRender.call(self);
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
        if ($.isFunction(p)) return p();
        return p;
      }
    }]);

    return Scope;
  }();

  delegate(Scope.prototype, ['on', 'trigger'], 'observer');

  // el is top of element

  var FilledScope = function (_Scope) {
    _inherits(FilledScope, _Scope);

    function FilledScope() {
      _classCallCheck(this, FilledScope);

      return _possibleConstructorReturn(this, Object.getPrototypeOf(FilledScope).apply(this, arguments));
    }

    _createClass(FilledScope, [{
      key: 'doRender',
      value: function doRender() {
        $(this.el).append(this.template);
      }
    }, {
      key: 'doSetId',
      value: function doSetId() {
        $(this.template).attr('data-id', this.id);
      }
    }]);

    return FilledScope;
  }(Scope);

  // el is parent of elements


  var PartScope = function (_Scope2) {
    _inherits(PartScope, _Scope2);

    function PartScope() {
      _classCallCheck(this, PartScope);

      return _possibleConstructorReturn(this, Object.getPrototypeOf(PartScope).apply(this, arguments));
    }

    _createClass(PartScope, [{
      key: 'doRender',
      value: function doRender() {
        $(this.el).html(this.template);
      }
    }, {
      key: 'doSetId',
      value: function doSetId() {
        $(this.el).attr('data-id', this.id);
      }
    }]);

    return PartScope;
  }(Scope);

  me.defaultProperties = ['el', 'on', 'render', 'sync', 'find', 'prop', 'trigger', 'bootstrap', 'observer'];

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
      o.trigger(prop);
    });
  }

  function onCollectionInserted(c, index, value) {
    log('onCollectionInserted', arguments);
  }

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
          var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
          var el = arguments.length <= 1 || arguments[1] === undefined ? document.createElement('div') : arguments[1];

          var scope = new PartScope({
            el: el,
            templates: this.componentType.templates,
            scripts: this.componentType.scripts,
            options: options
          });
          this.scope = scope;
          scope.bootstrap();
          return this;
        }
      }]);

      return Component;
    }();

    var ComponentType = function () {
      function ComponentType(scripts, templates, name) {
        _classCallCheck(this, ComponentType);

        this.scripts = scripts;

        if ($.type(templates) === 'string') {
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
        key: 'mixTo',
        value: function mixTo(el, params) {
          var component = this.create();
          component.init(params, el);
          return component;
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

  me.import = function (el, handler) {
    return new ComponentType(handler, el);
  };

  me.find = function (name) {
    return ComponentType.find(name);
  };

  me.onBeforeEvent(null, 'bootstrap', null, null);
  // something on boot?
  me.onAfterEvent(null, 'bootstrap', null, null);

  me.Observer = Observer;
  me.Collection = Collection;
  return me;
});