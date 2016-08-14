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

  function isFunction(o) {
    return typeof o === 'function';
  }

  // me ////////////////////////////////////////////////
  var me = function waitron(obj) {
    if (Array.isArray(obj)) {
      return new Collection(obj);
    }
  };

  function delegate(prototype, to, name) {
    if (Array.isArray(name)) {
      return _each(name, function (n) {
        delegate(prototype, to, n);
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
        onCollectionInserted(this, index, models);
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
        _each(this.models, handler);
      }
    }]);

    return Collection;
  }(Observer);

  // me ////////////////////////////////////////////////


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

  function listenate(o) {
    var checker = arguments.length <= 1 || arguments[1] === undefined ? function () {
      return true;
    } : arguments[1];

    var ret = [];
    _each(o, function (value, key) {
      if (!checker(key, value, o)) return;

      log('lisnated: ' + key);

      listenateProp(o, key);
      ret.push(key);
    });
    return ret;
  }

  var scopeRegex = /\{([\s\S]*)\}/;
  function getChangeEventName(prop) {
    return 'change:' + prop;
  }

  var Scope = function () {
    function addEventListener(scope, eventName, listener) {
      var el = arguments.length <= 3 || arguments[3] === undefined ? scope.el : arguments[3];

      if (el.addEventListener) {
        return el.addEventListener(eventName, decorateEventable(scope, eventName, listener), true);
      }
      if (el.attachEvent) {
        return el.attachEvent(eventName, decorateEventable(scope, eventName, listener));
      }
    }

    var Scope = function () {
      function Scope(params) {
        _classCallCheck(this, Scope);

        this.el = params.el;
        this.templates = params.templates;
        this.scripts = params.scripts;
        this.options = params.options;
        this.observer = new Observer();

        identify(this);
      }

      _createClass(Scope, [{
        key: 'bootstrap',
        value: function bootstrap() {
          var _this3 = this;

          this.unlistenatedProperties = []; // for includes unlistenatedProperties
          this.unlistenatedProperties = Object.getOwnPropertyNames(this);

          if (isFunction(this.scripts)) {
            this.scripts.bind(this).call(this, this.options, this);
          } else {
            evalInContext(this.scripts, this);
          }

          listenate(this, function (key, value, o) {
            return !isFunction(value) && !_this3.unlistenatedProperties.includes(key);
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
            _this4.trigger('rendered');
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
              self.on(getChangeEventName(prop), function (e) {
                $el.text(self[prop]);
              });
              $el.text(self[prop]);
            })();
          }

          _each(el.attributes, function (val, key) {
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

            self.on(getChangeEventName(key), function () {
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
              } else if (name === 'w:list') {
                var _ret3 = function () {
                  var list = _this6[key];
                  var $itemEl = $($el.children());
                  $itemEl.remove();

                  var typeName = $itemEl.attr('w:type');
                  if (typeName) {
                    (function () {
                      $itemEl.removeAttr('w:type');
                      var component = ComponentType.find(typeName);
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
                        var scope = creator(item, index);
                      });

                      list.on('inserted', function (index) {
                        var scope = creator(list.at(index), index);
                      });
                    })();
                  }
                  $el.removeAttr('w:list');
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

    delegate(Scope.prototype, 'observer', ['on', 'trigger']);

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
        $(this.template).attr('w:id', this.id);
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
        $(this.el).attr('w:id', this.id);
      }
    }]);

    return PartScope;
  }(Scope);

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
  me.onAfterRender = function () {};

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
      log('triggered ' + getChangeEventName(prop));
      o.trigger(getChangeEventName(prop));
    });
  }

  function onCollectionInserted(c, index, value) {
    log('onCollectionInserted', arguments);

    me.tickContext.push(c.id + '@inserted', function () {
      c.trigger('inserted', index, value);
    });
  }

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
    _createClass(ComponentType, null, [{
      key: 'createFromScript',
      value: function createFromScript(shadows) {
        var scripts = extractRegex(scriptRegex, shadows);
        var templates = extractRegex(templateRegex, shadows);
        return new ComponentType(scripts, templates);
      }
    }, {
      key: 'find',
      value: function find(name) {
        return ComponentType.list[name];
      }
    }]);

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

    return ComponentType;
  }();

  ComponentType.list = {};

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