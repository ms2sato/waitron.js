;(function (global, factory) { // eslint-disable-line
  'use strict'
  /* eslint-disable no-undef */
  var me = factory(global)
  if (typeof module === 'object' && module != null && module.exports) {
    module.exports = me
  } else {
    global.w = me
  }
  /* eslint-enable no-undef */
})(typeof window !== 'undefined' ? window : this, function (global, undefined) { // eslint-disable-line
  'use strict'
  /*global $ _ */

  // utils ////////////////////////////////////////////////

  function log () {
    console.log.apply(console, arguments)
  }

  function each (o, func) {
    if (Array.isArray(o)) {
      for (var i = 0; i < o.length; ++i) { func.call(o, o[i], i) }
      return o
    }

    for (var key in o) {
      if (o.hasOwnProperty(key)) func.call(o, o[key], key)
    }
    return o
  }

  // me ////////////////////////////////////////////////

  var Scope = (function () {
    function Scope (el) { this.el = el }

    Scope.prototype.on = function (eventName, listener) {
      if (arguments.length === 2) return addEventListener(this, eventName, listener)
      else return this.bind.apply(this, arguments)
    }

    Scope.prototype.bind = function (selector, eventName, listener) {
      return addEventListener(this, eventName, listener, $(this.el).find(selector)[0])
    }

    Scope.prototype.render = function () {
      var self = this
      me.nextTick(function () {
        me.onBeforeRender.call(self)
        $(self.el).html(self.template(self))
        self.find('*[data-text]').each(function () {
          var key = $(this).data('text')
          $(this).text(self[key])
        })

        self.find('*[data-list]').each(function () {
          var $list = $(this)
          var listName = $list.data('list')
          var list = self[listName]
          var $itemEl = $($(this).find('*')[0])
          $itemEl.remove()

          list.each(function () {
            $itemEl.clone().appendTo($list)
          })
        })

        // FIXME: to addEventListener
        self.onRendered && decorateEventable(self, 'rendered', self.onRendered).call(self)

        me.onAfterRender.call(self)
      })
    }

    Scope.prototype.sync = function (attr) {
      var self = this
      var value = self.prop(attr)
      var $bind = this.find('*[data-text=' + attr + ']')
      if ($bind.size() === 0) return this.render()

      $bind.each(function () {
        $(this).text(value)
      })
    }

    Scope.prototype.find = function () {
      var $el = $(this.el)
      return $el.find.apply($el, arguments)
    }

    Scope.prototype.prop = function (key) {
      var p = this[key]
      if (_.isFunction(p)) return p()
      return p
    }

    return Scope
  })()

  var me = function waitron () {}

  me.defaultProperties = ['el', 'on', 'render', 'sync', 'find', 'prop']

  if (global.setImmediate) {
    me.nextTick = function (func) {
      global.setImmediate(decorateEventable(null, 'tick', func))
    }
  } else {
    me.nextTick = function (func) {
      global.setTimeout(decorateEventable(null, 'tick', func), 0)
    }
  }

  me.onBeforeRender = function () {}
  me.onAfterRender = function () {
    var self = this
    $(self.el).find('input[data-value]').each(function () {
      var $el = $(this)
      var key = $el.data('value')
      addEventListener(self, 'change', function () {
        self[key] = $el.val()
      })
      addEventListener(self, 'keyup', function () {
        self[key] = $el.val()
      })
    })
  }

  function onNewProperty (o, prop, newValue) {
    log('onNewProperty', arguments)
  }

  function onBeforePropertyChange (o, prop, value, newValue) {
    if (!(prop in o)) {
      onNewProperty(o, prop, newValue)
    }

    log('onBeforePropertyChange', arguments)
  }

  function onAfterPropertyChange (o, prop, value, oldValue) {
    log('onAfterPropertyChange', arguments)

    me.tickContext.push(o.id + '@' + prop, function () {
      o.update(prop)
    })
  }

  function onCollectionInserted (c, index, value) {
    log('onCollectionInserted', arguments)
  }

  function listenateProp (o, prop) {
    var value = o[prop]
    Object.defineProperty(o, prop, {
      get: function () { return value },
      set: function (newValue) {
        var oldValue = value
        onBeforePropertyChange(o, prop, value, newValue)
        value = newValue
        onAfterPropertyChange(o, prop, value, oldValue)
      },
      enumerable: true,
      configurable: true
    })
  }

  // TODO: unenhance

  me.enhanceProperties = ['id', 'onChange', 'update']

  var id_counter = 1
  me.enhance = function enhance (o) {
    each(o, function (value, key) {
      if (me.enhanceProperties.indexOf(key) !== -1) {
        throw new Error('Cannot enhance an object having property named ' + key + '!')
      }
    })

    if (o.__uniqueId === undefined) {
      // @see http://stackoverflow.com/questions/1997661/unique-object-identifier-in-javascript
      Object.defineProperty(o, '__uniqueId', {
        writable: true
      })

      o.__uniqueId = id_counter++

      Object.defineProperty(o, 'id', {
        get: function () {
          return this.__uniqueId
        }
      })
    }

    Object.defineProperty(o, 'listeners', {
      writable: true,
      value: {},
      enumerable: false,
      configurable: true
    })
    each(o, function (value, key) {
      if (me.defaultProperties.indexOf(key) !== -1) return

      listenateProp(o, key)
      o.listeners[key] = [] // FIXME: 効率化
    })

    o.onChange = function (key, listener) {
      if (Array.isArray(key)) {
        each(key, function (k) {
          o.listeners[k].push(listener)
        })
      } else {
        o.listeners[key].push(listener)
      }
    }

    o.update = function (attr) {
      if (attr) {
        return each(o.listeners[attr], function (l) { l() })
      }

      return each(o.listeners, function (listenerArr) {
        each(listenerArr, function (l) { l() })
      })
    }

    return Object.keys(o.listeners)
  }

  me.Observer = (function () {
    function Observer () {
      this.listenersHash = {}
    }

    Observer.prototype.on = function (name, listener) {
      if (!this.listenersHash[name]) {
        this.listenersHash[name] = []
      }
      this.listenersHash[name].push(listener)
    }

    // TODO: off and once

    Observer.prototype.trigger = function () {
      var name = arguments.shift()
      each(this.listenersHash[name], function (listener) {
        listener.apply(this, arguments)
      })
    }

    return Observer
  })()

  me.Collection = (function () {
    function Collection (models) {
      this.models = models || []
    }

    Collection.prototype = new me.Observer()

    Collection.prototype.push = function (models) {}
    Collection.prototype.at = function (index) {}
    Collection.prototype.shift = function () {}
    Collection.prototype.unshift = function () {}
    Collection.prototype.pop = function () {}
    Collection.prototype.insert = function (index, models) {
      var params = [index, 0]
      if (Array.isArray(models)) {
        params.push.apply(params, models)
      } else {
        params.push(models)
      }
      this.models.splice.apply(this.models, params)
      onCollectionInserted(this, index, models)
    }
    Collection.prototype.remove = function (models) {}
    Collection.prototype.clear = function () {}
    Collection.prototype.reset = function (models) {}
    Collection.prototype.sort = function (comparator) {}
    Collection.prototype.swap = function (lindex, rindex) {}

    Collection.prototype.each = function (handler) {
      each(this.models, handler)
    }

    return Collection
  })()

  // var c = new me.Collection([1, 2, 3])
  // c.insert(2, 4)

  // @see http://stackoverflow.com/questions/8403108/calling-eval-in-particular-context
  function evalInContext (js, context) {
    /* eslint-disable no-eval */
    return function () {
      /* eslint-disable no-unused-vars */
      var self = context
      /* eslint-enable no-unused-vars */
      return eval(js)
    }.call(context)
    /* eslint-enable no-eval */
  }

  var decorateEventable = function (scope, eventName, listener) {
    return function (event) {
      try {
        me.onBeforeEvent(scope, eventName, event, listener)
        var ret = listener.call(scope, event)
        return me.onAfterEvent(scope, eventName, event, listener, ret)
      } catch (ex) {
        me.onEventError(ex)
      } finally {
        me.onEventFinally(scope, eventName, event, listener)
      }
    }
  }
  function addEventListener (scope, eventName, listener, el) {
    el = el || scope.el
    if (el.addEventListener) {
      return el.addEventListener(eventName, decorateEventable(scope, eventName, listener), true)
    }
    if (el.attachEvent) {
      return el.attachEvent(eventName, decorateEventable(scope, eventName, listener))
    }
  }

  var TickContext = (function () {
    function TickContext (scope, eventName, event, listener) {
      this.scope = scope
      this.eventName = eventName
      this.event = event
      this.listener = listener
      this.queue = []
    }

    TickContext.prototype.execute = function () {
      // Q: Why unlimited loop ?
      // A: Because of pushing func to this.queue in queue process
      for (; this.queue.length > 0 ;) {
        this.queue.shift().call(this)
      }
    }

    TickContext.prototype.push = function (key, func) {
      this.queue.push(func)
    }

    TickContext.prototype.clear = function () {
      this.queue.length = 0
    }

    return TickContext
  })()

  me.onBeforeEvent = function (scope, eventName, event, listener) {
    me.tickContext = new TickContext(scope, eventName, event, listener)
  }

  me.onAfterEvent = function (scope, eventName, event, listener, ret) {
    log('onAfterEvent', eventName, event, listener, ret)
    me.tickContext.execute()
    return ret
  }

  me.onEventError = function (ex) {
    log(ex, ex.stack)
    throw ex
  }

  me.onEventFinally = function (scope, eventName, event, listener) {
    me.tickContext.clear()
  }

  var scriptsSelector = 'script[type="text/waitron"]'
  var scriptRegex = /<initialize>([\s\S]*)<\/initialize>/
  var templateRegex = /<template>([\s\S]*)<\/template>/
  function extractRegex (regex, text) {
    var m = regex.exec(text)
    return m[1] // TODO:join?
  }

  var ComponentType = (function () {
    function Component (componentType) { this.componentType = componentType }

    Component.prototype.init = function (params, el) {
      params = params || {}
      el = el || document.createElement('div')

      var templates = this.componentType.templates
      var scope = new Scope(el)
      var defaultRenderingReject = this.componentType.bootstrap(scope, params)
      var attrs = me.enhance(scope)

      $(el).attr('data-id', scope.id)
      this.scope = scope
      scope.template = _.template(templates)
      scope.render()

      if (defaultRenderingReject !== false) {
        each(attrs, function (attr) {
          scope.onChange(attr, function onChangeListener () {
            scope.sync(attr)
          })
        })
      }

      return this
    }

    function ComponentType (scripts, templates, name) {
      this.scripts = scripts

      if (_.isString(templates)) {
        this.templates = templates
        this.name = name
      } else {
        this.templates = $(templates).html()
        this.name = name || $(templates).attr('id')
      }

      ComponentType.list[this.name] = this
    }

    ComponentType.list = {}

    ComponentType.createFromScript = function (shadows) {
      var scripts = extractRegex(scriptRegex, shadows)
      var templates = extractRegex(templateRegex, shadows)
      return new ComponentType(scripts, templates)
    }

    ComponentType.prototype.create = function () {
      return new Component(this)
    }

    ComponentType.prototype.createAfter = function (el, params) {
      var component = this.create()
      component.init(params)
      $(el).after(component.scope.el)
      return component
    }

    ComponentType.prototype.bootstrap = function (scope, params) {
      if (typeof this.scripts === 'function') {
        return this.scripts.call(scope, params, scope)
      }
      evalInContext(this.scripts, scope)
    }

    ComponentType.find = function (name) {
      return ComponentType.list[name]
    }

    return ComponentType
  })()

  me.initFromScript = function (scriptEl) {
    var shadows = $(scriptEl).text()
    return ComponentType.createFromScript(shadows)
  }

  me.init = function () {
    $(scriptsSelector).each(function () {
      var componentType = me.initFromScript(this)

      componentType.createAfter(this)
    })
  }

  me.mount = function (el, handler) {
    return new ComponentType(handler, el)
  }

  me.find = function (name) {
    return ComponentType.find(name)
  }

  me.onBeforeEvent(null, 'bootstrap', null, null)
  // something on boot?
  me.onAfterEvent(null, 'bootstrap', null, null)

  return me
})
