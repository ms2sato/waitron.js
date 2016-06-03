;(((global, factory) => {
  /* eslint-disable no-undef */
  const me = factory(global)
  if (typeof module === 'object' && module != null && module.exports) {
    module.exports = me
  } else {
    global.w = me
  }
  /* eslint-enable no-undef */
}))(typeof window !== 'undefined' ? window : this, (global) => {
  /*global $ */

  // utils ////////////////////////////////////////////////
  function log () {
    console.log.apply(console, arguments)
  }

  function each (o, func) {
    if (Array.isArray(o)) {
      for (let i = 0; i < o.length; ++i) { func.call(o, o[i], i) }
      return o
    }

    for (const key in o) {
      if (o.hasOwnProperty(key)) func.call(o, o[key], key)
    }
    return o
  }

  // me ////////////////////////////////////////////////
  var me = function waitron () {}

  function delegate (prototype, name, to) {
    if (Array.isArray(name)) {
      return each(name, (n) => {
        delegate(prototype, n, to)
      })
    }

    prototype[name] = function () {
      this[to][name].apply(this[to], arguments)
    }
  }

  const identify = (() => {
    let id_counter = 1
    return function identify (o) {
      if (o.__uniqueId === undefined) {
        // @see http://stackoverflow.com/questions/1997661/unique-object-identifier-in-javascript
        Object.defineProperty(o, '__uniqueId', {
          writable: true
        })

        o.__uniqueId = id_counter++

        Object.defineProperty(o, 'id', {
          get () {
            return this.__uniqueId
          }
        })
      }
    }
  })()

  class Observer {
    constructor () {
      this.listenersHash = {}
    }

    on (name, listener) {
      if (!this.listenersHash[name]) {
        this.listenersHash[name] = []
      }
      this.listenersHash[name].push(listener)
    }

    trigger () {
      const name = Array.prototype.shift.call(arguments)
      each(this.listenersHash[name], (listener) => {
        listener.apply(this, arguments)
      })
    }
  }

  class Collection extends Observer {
    constructor (models) {
      super()
      this.models = models || []
    }

    push (models) {}
    at (index) {}
    shift () {}
    unshift () {}
    pop () {}

    insert (index, models) {
      const params = [index, 0]
      if (Array.isArray(models)) {
        params.push.apply(params, models)
      } else {
        params.push(models)
      }
      this.models.splice.apply(this.models, params)
      onCollectionInserted(this, index, models)
    }

    remove (models) {}
    clear () {}
    reset (models) {}
    sort (comparator) {}
    swap (lindex, rindex) {}

    each (handler) {
      each(this.models, handler)
    }
  }

  // me ////////////////////////////////////////////////

  function listenate (o) {
    function listenateProp (o, prop) {
      let value = o[prop]
      Object.defineProperty(o, prop, {
        get () { return value },
        set (newValue) {
          const oldValue = value
          onBeforePropertyChange(o, prop, value, newValue)
          value = newValue
          onAfterPropertyChange(o, prop, value, oldValue)
        },
        enumerable: true,
        configurable: true
      })
    }

    const ret = []
    each(o, (value, key) => {
      if (me.defaultProperties.indexOf(key) !== -1) return

      listenateProp(o, key)
      ret.push(key)
    })
    return ret
  }

  class Scope {
    constructor (params) {
      this.el = params.el
      this.templates = params.templates
      this.scripts = params.scripts
      this.options = params.options
      this.observer = new Observer()

      identify(this)
    }

    bootstrap () {
      if (typeof this.scripts === 'function') {
        this.scripts(this.options, this)
      } else {
        evalInContext(this.scripts, this)
      }

      listenate(this)

      $(this.el).attr('data-id', this.id)
      this.template = $(this.templates)
      console.log(this.templates)

      this.scan()
      this.render()
    }

    scanElm (el) {
      const scopeRegex = /\{([\s\S]*)\}/
      const self = this

      if (el.nodeType === 3) {
        const m = scopeRegex.exec(el.textContent)
        if (m) {
          const ename = m[1]
          self.on(ename, (e) => {
            el.textContent = self[ename]
          })
          el.textContent = self[ename]
        }
      } else {
        each(el.attributes, (val, key) => {
          const m = scopeRegex.exec(val.textContent)
          if (m) {
            addEventListener(self, val.nodeName.substr(2), (e) => {
              self[m[1]](e)
            }, el)
            $(el).removeAttr(val.nodeName)
          }
        })
      }

      this.template.find('*[data-list]').each(function () {
        const $list = $(this)
        const listName = $list.data('list')
        const list = self[listName]
        const $itemEl = $($(this).find('*')[0])
        $itemEl.remove()

        list.each(() => {
          $itemEl.clone().appendTo($list)
        })
      })

      $(el).contents().each((i, el) => {
        this.scanElm(el)
      })
    }

    scan () {
      this.template.each((i, el) => {
        this.scanElm(el)
      })
    }

    render () {
      const self = this
      me.nextTick(() => {
        me.onBeforeRender.call(self)
        $(self.el).html(self.template)

        // FIXME: to addEventListener
        self.onRendered && decorateEventable(self, 'rendered', self.onRendered).call(self)

        me.onAfterRender.call(self)
      })
    }

    find () {
      const $el = $(this.el)
      return $el.find.apply($el, arguments)
    }

    prop (key) {
      const p = this[key]
      if ($.isFunction(p)) return p()
      return p
    }
  }

  delegate(Scope.prototype, ['on', 'trigger'], 'observer')

  me.defaultProperties = ['el', 'on', 'render', 'sync', 'find', 'prop', 'trigger', 'bootstrap', 'observer']

  if (global.setImmediate) {
    me.nextTick = func => {
      global.setImmediate(decorateEventable(null, 'tick', func))
    }
  } else {
    me.nextTick = func => {
      global.setTimeout(decorateEventable(null, 'tick', func), 0)
    }
  }

  me.onBeforeRender = () => {}
  me.onAfterRender = function () {
    const self = this
    $(self.el).find('input[data-value]').each(function () {
      const $el = $(this)
      const key = $el.data('value')
      addEventListener(self, 'change', () => {
        self[key] = $el.val()
      })
      addEventListener(self, 'keyup', () => {
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

    me.tickContext.push(`${o.id}@${prop}`, () => {
      o.trigger(prop)
    })
  }

  function onCollectionInserted (c, index, value) {
    log('onCollectionInserted', arguments)
  }

  // var c = new me.Collection([1, 2, 3])
  // c.insert(2, 4)

  // @see http://stackoverflow.com/questions/8403108/calling-eval-in-particular-context
  function evalInContext (js, context) {
    /* eslint-disable no-eval */
    return function () {
      /* eslint-disable no-unused-vars */
      const self = context
      /* eslint-enable no-unused-vars */
      return eval(js)
    }.call(context)
    /* eslint-enable no-eval */
  }

  var decorateEventable = (scope, eventName, listener) => event => {
    try {
      me.onBeforeEvent(scope, eventName, event, listener)
      const ret = listener.call(scope, event)
      return me.onAfterEvent(scope, eventName, event, listener, ret)
    } catch (ex) {
      me.onEventError(ex)
    } finally {
      me.onEventFinally(scope, eventName, event, listener)
    }
  }
  function addEventListener (scope, eventName, listener, el = scope.el) {
    if (el.addEventListener) {
      return el.addEventListener(eventName, decorateEventable(scope, eventName, listener), true)
    }
    if (el.attachEvent) {
      return el.attachEvent(eventName, decorateEventable(scope, eventName, listener))
    }
  }

  class TickContext {
    constructor (scope, eventName, event, listener) {
      this.scope = scope
      this.eventName = eventName
      this.event = event
      this.listener = listener
      this.queue = []
    }

    execute () {
      // Q: Why unlimited loop ?
      // A: Because of pushing func to this.queue in queue process
      for (; this.queue.length > 0;) {
        this.queue.shift().call(this)
      }
    }

    push (key, func) {
      this.queue.push(func)
    }

    clear () {
      this.queue.length = 0
    }
  }

  me.onBeforeEvent = (scope, eventName, event, listener) => {
    me.tickContext = new TickContext(scope, eventName, event, listener)
  }

  me.onAfterEvent = (scope, eventName, event, listener, ret) => {
    log('onAfterEvent', eventName, event, listener, ret)
    me.tickContext.execute()
    return ret
  }

  me.onEventError = ex => {
    log(ex, ex.stack)
    throw ex
  }

  me.onEventFinally = (scope, eventName, event, listener) => {
    me.tickContext.clear()
  }

  const scriptsSelector = 'script[type="text/waitron"]'
  const scriptRegex = /<initialize>([\s\S]*)<\/initialize>/
  const templateRegex = /<template>([\s\S]*)<\/template>/
  function extractRegex (regex, text) {
    const m = regex.exec(text)
    return m[1] // TODO:join?
  }

  const ComponentType = ((() => {
    class Component {
      constructor (componentType) { this.componentType = componentType }

      init (options = {}, el = document.createElement('div')) {
        const scope = new Scope({
          el: el,
          templates: this.componentType.templates,
          scripts: this.componentType.scripts,
          options: options
        })
        this.scope = scope
        scope.bootstrap()
        return this
      }
    }

    class ComponentType {
      constructor (scripts, templates, name) {
        this.scripts = scripts

        if ($.type(templates) === 'string') {
          this.templates = templates
          this.name = name
        } else {
          this.templates = $(templates).html()
          this.name = name || $(templates).attr('id')
        }

        ComponentType.list[this.name] = this
      }

      create () {
        return new Component(this)
      }

      createAfter (el, params) {
        const component = this.create()
        component.init(params)
        $(el).after(component.scope.el)
        return component
      }
    }

    ComponentType.list = {}

    ComponentType.createFromScript = shadows => {
      const scripts = extractRegex(scriptRegex, shadows)
      const templates = extractRegex(templateRegex, shadows)
      return new ComponentType(scripts, templates)
    }

    ComponentType.find = name => ComponentType.list[name]

    return ComponentType
  }))()

  me.initFromScript = scriptEl => {
    const shadows = $(scriptEl).text()
    return ComponentType.createFromScript(shadows)
  }

  me.init = () => {
    $(scriptsSelector).each(function () {
      const componentType = me.initFromScript(this)

      componentType.createAfter(this)
    })
  }

  me.mount = (el, handler) => new ComponentType(handler, el)

  me.find = name => ComponentType.find(name)

  me.onBeforeEvent(null, 'bootstrap', null, null)
  // something on boot?
  me.onAfterEvent(null, 'bootstrap', null, null)

  me.Observer = Observer
  me.Collection = Collection
  return me
})
