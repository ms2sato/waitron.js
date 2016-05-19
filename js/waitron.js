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


  function log() {
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

  var me = function (el) {
    return {
      el: el,
      on: function (eventName, listener) {
        return addEventListener(this, eventName, listener)
      },
      render: function () {
        $(this.el).html(this.template(this))
      }
    }
  }

  function onNewProperty(o, prop, newValue) {
    log('onNewProperty', arguments)
  }

  function onBeforeChange(o, prop, value, newValue) {
    if (!(prop in o)) {
      onNewProperty(o, prop, newValue)
    }

    log('onBeforeChange', arguments)
  }
  function onAfterChange(o, prop, value, oldValue) {
    log('onAfterChange', arguments)

    me.tickContext.push(o.id, function () {
      o.update()
    });
  }

  function listenateProp (o, prop) {
    var value = o[prop]
    Object.defineProperty(o, prop, {
      get: function () { return value },
      set : function (newValue) {
        var oldValue = value
        onBeforeChange(o, prop, value, newValue)
        value = newValue
        onAfterChange(o, prop, value, oldValue)
      },
      enumerable : true,
      configurable : true
    })
  }

  // TODO: unenhance

  var id_counter = 1;
  me.enhance = function enhance (o) {
    if (o.__uniqueId === undefined) {
      // @see http://stackoverflow.com/questions/1997661/unique-object-identifier-in-javascript
      Object.defineProperty(o, "__uniqueId", {
          writable: true
      })

      o.__uniqueId = id_counter++

      Object.defineProperty(o, "id", {
          get: function() {
              return this.__uniqueId
          }
      })
    }

    Object.defineProperty(o, "listeners", {
      writable: true,
      value: {},
      enumerable : false,
      configurable : true
    })
    each(o, function (value, key) {
      if (key == "el" || key == "on" || key == "render") return

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

    o.update = function () {
      each(o.listeners, function (listenerArr) {
        each(listenerArr, function (l) { l() })
      })
    }

    return Object.keys(o.listeners)
  }

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

  function addEventListener (scope, eventName, listener) {
    var hand = function (event) {
      try {
        me.onBeforeEvent(scope, eventName, event, listener)
        var ret = listener(event)
        return me.onAfterEvent(scope, eventName, event, listener, ret)
      } catch (ex) {
        me.onEventError(ex)
      } finally {
        me.onEventFinally(scope, eventName, event, listener)
      }
    }
    if (scope.el.addEventListener) {
      return scope.el.addEventListener(eventName, hand, true)
    }
    if (scope.el.attachEvent) {
      return scope.el.attachEvent(eventName, hand)
    }
  };

  var TickContext = (function () {

    function TickContext (scope, eventName, event, listener) {
      this.scope = scope
      this.eventName = eventName
      this.event = event
      this.listener = listener
      this.actions = {}
    }

    TickContext.prototype.execute = function () {
      var self = this
      each(this.actions, function (value, key) {
        self.actions[key].call(self)
      })
    }

    TickContext.prototype.push = function (key, func) {
      this.actions[key] = func
    }

    TickContext.prototype.valueOf = function (key) {
      return this.actions[key]
    }

    TickContext.prototype.clear = function () {
      var self = this
      each(this.actions, function (value, key) {
        delete self.actions[key]
      })
    }

    return TickContext
  })();


  me.onBeforeEvent = function (scope, eventName, event, listener) {
    me.tickContext = new TickContext(scope, eventName, event, listener)
  }

  me.onAfterEvent = function (scope, eventName, event, listener, ret) {
    log("onAfterEvent", eventName, event, listener, ret)
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
    return m[1]
  }

  var ComponentType = (function () {
    function Component (componentType) { this.componentType = componentType }

    Component.prototype.init = function (el) {
      el = el || document.createElement('div')

      var templates = this.componentType.templates
      var scope = me(el)
      if (this.componentType.bootstrap(scope) !== false) {
        var attrs = me.enhance(scope)
        scope.onChange(attrs, function onChangeListener () {
          scope.render()
        })
      }

      this.scope = scope
      scope.template = _.template(templates)
      scope.render()

      return this
    }

    function ComponentType (scripts, templates) {
      this.scripts = scripts
      this.templates = templates
    }

    ComponentType.createFromScript = function (shadows) {
      var scripts = extractRegex(scriptRegex, shadows)
      var templates = extractRegex(templateRegex, shadows)
      return new ComponentType(scripts, templates)
    }

    ComponentType.prototype.create = function () {
      return new Component(this)
    }

    ComponentType.prototype.createAfter = function (el) {
      var component = this.create()
      component.init()
      $(el).after(component.scope.el)
      return component
    }

    ComponentType.prototype.bootstrap = function (scope) {
      if (typeof this.scripts === 'function') {
        return this.scripts.call(scope)
      }
      evalInContext(this.scripts, scope)
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

  me.addType = function (el, handler) {
    return new ComponentType(handler, el)
  }

  var o = {}
  o.test = 111
  o.test2 = {aa: "sss"}

  me.enhance(o)

  me.onBeforeEvent(null, 'bootstrap', null, null)

  o.test = 222
  o.test2 = {bb: "111"}

  o.onChange("test", function () {
    console.log('enhanced test called')
  })

  o.test = 333

  me.onAfterEvent(null, 'bootstrap', null, null)

  return me
})
