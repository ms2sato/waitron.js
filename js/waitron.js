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

  var util = function (util) {
    // @see http://qiita.com/Layzie/items/465e715dae14e2f601de
    function is(type, obj) {
      var clas = Object.prototype.toString.call(obj).slice(8, -1);
      return obj !== undefined && obj !== null && clas === type;
    }

    util.isString = function (o) {
      return is('String', o);
    };

    util.isFunction = function (o) {
      return is('Function', o);
    };

    util.each = function (o, func) {
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
    };

    util.delegate = function (prototype, to, name) {
      if (Array.isArray(name)) {
        return util.each(name, function (n) {
          util.delegate(prototype, to, n);
        });
      }

      prototype[name] = function () {
        this[to][name].apply(this[to], arguments);
      };
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
          var _this = this,
              _arguments = arguments;

          var name = Array.prototype.shift.call(arguments);
          util.each(this.listenersHash[name], function (listener) {
            listener.apply(_this, _arguments);
          });
        }
      }]);

      return Observer;
    }();

    util.createIdentify = function () {
      var prop = arguments.length <= 0 || arguments[0] === undefined ? 'id' : arguments[0];
      var internalProp = arguments.length <= 1 || arguments[1] === undefined ? '__uniqueId' : arguments[1];

      var id_counter = 1;
      return function identify(o) {
        if (o.__uniqueId === undefined) {
          // @see http://stackoverflow.com/questions/1997661/unique-object-identifier-in-javascript
          Object.defineProperty(o, internalProp, {
            writable: true
          });

          o[internalProp] = id_counter++;

          Object.defineProperty(o, prop, {
            get: function get() {
              return this[internalProp];
            }
          });
        }
      };
    };

    util.Observer = Observer;

    return util;
  }({});

  // me ////////////////////////////////////////////////
  var me = function waitron(obj) {
    if (Array.isArray(obj)) {
      return new Collection(obj);
    }
  };

  me.options = {
    prefix: 'w'
  };

  me.aspect = {
    onNewProperty: function onNewProperty(o, prop, newValue) {
      log('onNewProperty', arguments);
    },
    onBeforePropertyChange: function onBeforePropertyChange(o, prop, value, newValue) {
      if (!(prop in o)) {
        this.onNewProperty(o, prop, newValue);
      }

      log('onBeforePropertyChange', arguments);
    },
    onAfterPropertyChange: function onAfterPropertyChange(o, prop, value, oldValue) {
      log('onAfterPropertyChange', arguments);

      me.tickContext.push(o.id + '@' + EK.change(prop), function () {
        log('triggered ' + EK.change(prop));
        o.trigger(EK.change(prop));
      });
    },
    onCollectionInserted: function onCollectionInserted(c, index, value) {
      log('onCollectionInserted', arguments);

      me.tickContext.push(c.id + '@' + EK.inserted, function () {
        c.trigger(EK.inserted, index, value);
      });
    }
  };

  var Collection = function (_util$Observer) {
    _inherits(Collection, _util$Observer);

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
      value: function at(index) {
        return this.models[index];
      }
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
        me.aspect.onCollectionInserted(this, index, models);
      }
    }, {
      key: 'move',
      value: function move() {}
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
        util.each(this.models, handler);
      }
    }]);

    return Collection;
  }(util.Observer);

  function listenateProp(o, prop) {
    var value = o[prop];
    Object.defineProperty(o, prop, {
      get: function get() {
        return value;
      },
      set: function set(newValue) {
        var oldValue = value;
        me.aspect.onBeforePropertyChange(o, prop, value, newValue);
        value = newValue;
        me.aspect.onAfterPropertyChange(o, prop, value, oldValue);
      },

      enumerable: true,
      configurable: true
    });
  }

  function listenate(o) {
    var checker = arguments.length <= 1 || arguments[1] === undefined ? function () {
      return true;
    } : arguments[1];

    var ret = [];
    util.each(o, function (value, key) {
      if (!checker(key, value, o)) return;

      log('lisnated: ' + key);

      listenateProp(o, key);
      ret.push(key);
    });
    return ret;
  }

  // scope ////////////////////////////////////////////////
  var EK = function () {
    var EventKeys = function () {
      function EventKeys() {
        _classCallCheck(this, EventKeys);
      }

      _createClass(EventKeys, [{
        key: 'change',
        value: function change(prop) {
          return 'change:' + prop;
        }
      }, {
        key: 'rendered',
        get: function get() {
          return 'rendered';
        }
      }, {
        key: 'inserted',
        get: function get() {
          return 'inserted';
        }
      }, {
        key: 'tick',
        get: function get() {
          return 'tick';
        }
      }]);

      return EventKeys;
    }();

    return new EventKeys();
  }();

  var originalAttributes = ['id', 'type', 'list'];
  var OA = function () {
    var OA = {};
    util.each(originalAttributes, function (value) {
      Object.defineProperty(OA, value, {
        get: function get() {
          return me.options.prefix + ':' + value;
        },

        enumerable: true,
        configurable: false
      });
    });
    return OA;
  }();

  var Scope = function () {
    var scopeRegex = /\{([\s\S]+)\}/;

    function addEventListener(scope, eventName, listener) {
      var el = arguments.length <= 3 || arguments[3] === undefined ? scope.el : arguments[3];

      if (el.addEventListener) {
        return el.addEventListener(eventName, decorateEventable(scope, eventName, listener), true);
      }
      if (el.attachEvent) {
        return el.attachEvent(eventName, decorateEventable(scope, eventName, listener));
      }
    }

    var identify = util.createIdentify();

    var Scope = function () {
      function Scope(params) {
        _classCallCheck(this, Scope);

        this.el = params.el;
        this.templates = params.templates;
        this.scripts = params.scripts;
        this.options = params.options;
        this.observer = new util.Observer();

        identify(this);
      }

      _createClass(Scope, [{
        key: 'bootstrap',
        value: function bootstrap() {
          var _this3 = this;

          this.unlistenatedProperties = []; // for includes unlistenatedProperties
          this.unlistenatedProperties = Object.getOwnPropertyNames(this);

          if (!util.isFunction(this.scripts)) {
            throw new Error('script must be a function');
          }

          this.scripts(this.options, this);

          listenate(this, function (key, value, o) {
            return !util.isFunction(value) && !_this3.unlistenatedProperties.includes(key);
          });

          this.template = $(this.templates);
          this.doSetId();
          log(this.templates);

          this.scan();
          this.render();
        }
      }, {
        key: 'render',
        value: function render() {
          var _this4 = this;

          var self = this;
          me.nextTick(function () {
            me.onBeforeRender.call(self);
            _this4.doRender();
            _this4.trigger(EK.rendered);
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
          return this[key];
        }

        // private

      }, {
        key: 'scanElm',
        value: function scanElm(el) {
          var _this5 = this;

          var self = this;
          var $el = $(el);

          this.scanValues($el);

          var text = $el.text();
          var m = scopeRegex.exec(text);
          if (m) {
            (function () {
              var prop = m[1];
              self.on(EK.change(prop), function (e) {
                $el.text(self[prop]);
              });
              $el.text(self[prop]);
            })();
          }

          util.each(el.attributes, function (val, key) {
            _this5.scanAttr(el, key, val);
          });

          $(el).children().each(function (i, el) {
            _this5.scanElm(el);
          });
        }
      }, {
        key: 'scanValues',
        value: function scanValues($el) {
          var self = this;
          $el.find('input[value]').each(function () {
            var $el = $(this);
            var value = $el.val();
            var m = scopeRegex.exec(value);
            if (!m) return;

            var key = m[1];
            $el.val(self[key]);
            addEventListener(self, 'change', function () {
              self[key] = $el.val();
            }, this);
            addEventListener(self, 'keyup', function () {
              self[key] = $el.val();
            }, this);

            self.on(EK.change(key), function () {
              $el.val(self[key]);
            });
          });
        }
      }, {
        key: 'scanAttr',
        value: function scanAttr(el, key, val) {
          var _this6 = this;

          var $el = $(el);
          var name = val.nodeName;
          var m = scopeRegex.exec(val.textContent);
          if (m) {
            var _ret2 = function () {
              var key = m[1];
              if (name.substr(0, 2) === 'on') {
                addEventListener(_this6, name.substr(2), function (e) {
                  _this6[key](e);
                }, el);
                $(el).removeAttr(name);
              } else if (name === OA.list) {
                var _ret3 = function () {
                  var list = _this6[key];
                  var $itemEl = $($el.children());
                  $itemEl.remove();

                  var typeName = $itemEl.attr(OA.type);
                  if (typeName) {
                    (function () {
                      $itemEl.removeAttr(OA.type);
                      var component = Component.find(typeName);
                      list.each(function (item, index) {
                        var templates = $itemEl.clone();
                        templates.append($(component.templates).clone());
                        var scope = new IndexedScope({
                          el: el,
                          templates: templates,
                          scripts: component.scripts,
                          index: index,
                          options: item
                        });
                        scope.bootstrap();
                      });
                    })();
                  } else {
                    (function () {
                      var creator = function creator(item, index) {
                        var scope = new IndexedScope({
                          el: el,
                          templates: $itemEl.clone(),
                          scripts: function scripts() {
                            scope.$this = item;
                          },
                          index: index,
                          options: {}
                        });
                        scope.bootstrap();
                        return scope;
                      };

                      list.each(function (item, index) {
                        creator(item, index);
                      });

                      list.on(EK.inserted, function (index) {
                        creator(list.at(index), index);
                      });
                    })();
                  }
                  $el.removeAttr(OA.list);
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
        }
      }, {
        key: 'scan',
        value: function scan() {
          var _this7 = this;

          this.template.each(function (i, el) {
            _this7.scanElm(el);
          });
        }
      }]);

      return Scope;
    }();

    util.delegate(Scope.prototype, 'observer', ['on', 'trigger']);

    return Scope;
  }();

  // el is parent of element

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
        $(this.template).attr(OA.id, this.id);
      }
    }]);

    return FilledScope;
  }(Scope);

  var IndexedScope = function (_FilledScope) {
    _inherits(IndexedScope, _FilledScope);

    function IndexedScope(params) {
      _classCallCheck(this, IndexedScope);

      var _this9 = _possibleConstructorReturn(this, Object.getPrototypeOf(IndexedScope).call(this, params));

      _this9.index = params.index;
      return _this9;
    }

    _createClass(IndexedScope, [{
      key: 'doRender',
      value: function doRender() {
        if (this.index === 0) {
          return $(this.el).append(this.template);
        }
        var $target = $(this.el).children('*:nth-child(' + this.index + ')');
        if ($target.size() === 0) {
          throw new Error('*:nth-child(' + this.index + ') not found');
        }

        return $target.after(this.template);
      }
    }]);

    return IndexedScope;
  }(FilledScope);

  // el is top of elements


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
        $(this.el).attr(OA.id, this.id);
      }
    }]);

    return PartScope;
  }(Scope);

  if (global.setImmediate) {
    me.nextTick = function (func) {
      global.setImmediate(decorateEventable(null, EK.tick, func));
    };
  } else {
    me.nextTick = function (func) {
      global.setTimeout(decorateEventable(null, EK.tick, func), 0);
    };
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

  me.onBeforeRender = function () {};
  me.onAfterRender = function () {};

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

  var Component = function () {
    _createClass(Component, null, [{
      key: 'find',
      value: function find(name) {
        return Component.list[name];
      }
    }]);

    function Component(scripts, templates, name) {
      _classCallCheck(this, Component);

      this.scripts = scripts;
      if (util.isString(templates)) {
        this.templates = templates;
        this.name = name;
      } else {
        this.templates = $(templates).html();
        this.name = name || $(templates).attr('id');
      }

      Component.list[this.name] = this;
    }

    _createClass(Component, [{
      key: 'mixTo',
      value: function mixTo() {
        var el = arguments.length <= 0 || arguments[0] === undefined ? document.createElement('div') : arguments[0];
        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        var scope = new PartScope({
          el: el,
          templates: this.templates,
          scripts: this.scripts,
          options: options
        });
        scope.bootstrap();
        return scope;
      }
    }, {
      key: 'createInto',
      value: function createInto(el) {
        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        var scope = new FilledScope({
          el: el,
          templates: this.templates,
          scripts: this.scripts,
          options: options
        });
        scope.bootstrap();
        return scope;
      }
    }, {
      key: 'createAfter',
      value: function createAfter(el, params) {
        var scope = this.mixTo(document.createElement('div'), params);
        $(el).after(scope.el);
        return scope;
      }
    }]);

    return Component;
  }();

  Component.list = {};

  me.define = function (el, handler) {
    return new Component(handler, el);
  };

  me.find = function (name) {
    return Component.find(name);
  };

  me.Observer = util.Observer;
  me.Collection = Collection;
  return me;
});