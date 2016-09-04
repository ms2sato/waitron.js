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

  const util = (function (util) {
    // @see http://qiita.com/Layzie/items/465e715dae14e2f601de
    function is (type, obj) {
      const clas = Object.prototype.toString.call(obj).slice(8, -1)
      return obj !== undefined && obj !== null && clas === type
    }

    util.isString = function (o) {
      return is('String', o)
    }

    util.isFunction = function (o) {
      return is('Function', o)
    }

    util.each = function (o, func) {
      if (Array.isArray(o)) {
        for (let i = 0; i < o.length; ++i) { func.call(o, o[i], i) }
        return o
      }

      for (const key in o) {
        if (o.hasOwnProperty(key)) func.call(o, o[key], key)
      }
      return o
    }

    util.delegate = function (prototype, to, name) {
      if (Array.isArray(name)) {
        return util.each(name, (n) => {
          util.delegate(prototype, to, n)
        })
      }

      prototype[name] = function () {
        this[to][name].apply(this[to], arguments)
      }
    }

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
        util.each(this.listenersHash[name], (listener) => {
          listener.apply(this, arguments)
        })
      }
    }

    util.createIdentify = (prop = 'id', internalProp = '__uniqueId') => {
      let id_counter = 1
      return function identify (o) {
        if (o.__uniqueId === undefined) {
          // @see http://stackoverflow.com/questions/1997661/unique-object-identifier-in-javascript
          Object.defineProperty(o, internalProp, {
            writable: true
          })

          o[internalProp] = id_counter++

          Object.defineProperty(o, prop, {
            get () {
              return this[internalProp]
            }
          })
        }
      }
    }

    util.Observer = Observer

    return util
  })({})

  // me ////////////////////////////////////////////////
  const me = function waitron (obj) {
    if (Array.isArray(obj)) {
      return new Collection(obj)
    }
  }

  me.options = {
    prefix: 'w'
  }

  me.aspect = {
    onNewProperty (o, prop, newValue) {
      log('onNewProperty', arguments)
    },

    onBeforePropertyChange (o, prop, value, newValue) {
      if (!(prop in o)) {
        this.onNewProperty(o, prop, newValue)
      }

      log('onBeforePropertyChange', arguments)
    },

    onAfterPropertyChange (o, prop, value, oldValue) {
      log('onAfterPropertyChange', arguments)

      me.tickContext.push(`${o.id}@${EK.change(prop)}`, () => {
        log(`triggered ${EK.change(prop)}`)
        o.trigger(EK.change(prop))
      })
    },

    onCollectionInserted (c, index, value) {
      log('onCollectionInserted', arguments)

      me.tickContext.push(`${c.id}@${EK.inserted}`, () => {
        c.trigger(EK.inserted, index, value)
      })
    }
  }

  class Collection extends util.Observer {
    constructor (models) {
      super()
      this.models = models || []
    }

    push (models) {}
    at (index) { return this.models[index] }
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
      me.aspect.onCollectionInserted(this, index, models)
    }

    move () {}

    remove (models) {}
    clear () {}
    reset (models) {}
    sort (comparator) {}
    swap (lindex, rindex) {}

    each (handler) {
      util.each(this.models, handler)
    }
  }

  function listenateProp (o, prop) {
    let value = o[prop]
    Object.defineProperty(o, prop, {
      get () { return value },
      set (newValue) {
        const oldValue = value
        me.aspect.onBeforePropertyChange(o, prop, value, newValue)
        value = newValue
        me.aspect.onAfterPropertyChange(o, prop, value, oldValue)
      },
      enumerable: true,
      configurable: true
    })
  }

  function listenate (o, checker = function () { return true }) {
    const ret = []
    util.each(o, (value, key) => {
      if (!checker(key, value, o)) return

      log(`lisnated: ${key}`)

      listenateProp(o, key)
      ret.push(key)
    })
    return ret
  }

  // scope ////////////////////////////////////////////////
  const EK = (() => {
    class EventKeys {
      change (prop) { return `change:${prop}` }
      get rendered () { return 'rendered' }
      get inserted () { return 'inserted' }
      get tick () { return 'tick' }
    }
    return new EventKeys()
  })()

  const originalAttributes = ['id', 'type', 'list']
  const OA = (() => {
    const OA = {}
    util.each(originalAttributes, function (value) {
      Object.defineProperty(OA, value, {
        get () { return `${me.options.prefix}:${value}` },
        enumerable: true,
        configurable: false
      })
    })
    return OA
  })()

  const Scope = (() => {
    const scopeRegex = /\{([\s\S]+)\}/

    function addEventListener (scope, eventName, listener, el = scope.el) {
      if (el.addEventListener) {
        return el.addEventListener(eventName, decorateEventable(scope, eventName, listener), true)
      }
      if (el.attachEvent) {
        return el.attachEvent(eventName, decorateEventable(scope, eventName, listener))
      }
    }

    const identify = util.createIdentify()

    class Scope {
      constructor (params) {
        this.el = params.el
        this.templates = params.templates
        this.scripts = params.scripts
        this.options = params.options
        this.observer = new util.Observer()

        identify(this)
      }

      bootstrap () {
        this.unlistenatedProperties = [] // for includes unlistenatedProperties
        this.unlistenatedProperties = Object.getOwnPropertyNames(this)

        if (!util.isFunction(this.scripts)) {
          throw new Error('script must be a function')
        }

        this.scripts(this.options, this)

        listenate(this, (key, value, o) => {
          return !util.isFunction(value) && !this.unlistenatedProperties.includes(key)
        })

        this.template = $(this.templates)
        this.doSetId()
        log(this.templates)

        this.scan()
        this.render()
      }

      render () {
        const self = this
        me.nextTick(() => {
          me.onBeforeRender.call(self)
          this.doRender()
          this.trigger(EK.rendered)
          me.onAfterRender.call(self)
        })
      }

      find () {
        const $el = $(this.el)
        return $el.find.apply($el, arguments)
      }

      prop (key) {
        return this[key]
      }

      // private

      scanElm (el) {
        const self = this
        const $el = $(el)

        this.scanValues($el)

        const text = $el.text()
        const m = scopeRegex.exec(text)
        if (m) {
          const prop = m[1]
          self.on(EK.change(prop), (e) => {
            $el.text(self[prop])
          })
          $el.text(self[prop])
        }

        util.each(el.attributes, (val, key) => {
          this.scanAttr(el, key, val)
        })

        $(el).children().each((i, el) => {
          this.scanElm(el)
        })
      }

      scanValues ($el) {
        const self = this
        $el.find('input[value]').each(function () {
          const $el = $(this)
          const value = $el.val()
          const m = scopeRegex.exec(value)
          if (!m) return

          const key = m[1]
          $el.val(self[key])
          addEventListener(self, 'change', () => {
            self[key] = $el.val()
          }, this)
          addEventListener(self, 'keyup', () => {
            self[key] = $el.val()
          }, this)

          self.on(EK.change(key), () => {
            $el.val(self[key])
          })
        })
      }

      scanAttr (el, key, val) {
        const $el = $(el)
        const name = val.nodeName
        const m = scopeRegex.exec(val.textContent)
        if (m) {
          const key = m[1]
          if (name.substr(0, 2) === 'on') {
            addEventListener(this, name.substr(2), (e) => {
              this[key](e)
            }, el)
            $(el).removeAttr(name)
          } else if (name === OA.list) {
            const list = this[key]
            const $itemEl = $($el.children())
            $itemEl.remove()

            const typeName = $itemEl.attr(OA.type)
            if (typeName) {
              $itemEl.removeAttr(OA.type)
              const component = Component.find(typeName)
              list.each((item, index) => {
                const templates = $itemEl.clone()
                templates.append($(component.templates).clone())
                const scope = new IndexedScope({
                  el: el,
                  templates: templates,
                  scripts: component.scripts,
                  index: index,
                  options: item
                })
                scope.bootstrap()
              })
            } else {
              const creator = (item, index) => {
                const scope = new IndexedScope({
                  el: el,
                  templates: $itemEl.clone(),
                  scripts: function () { scope.$this = item },
                  index: index,
                  options: {}
                })
                scope.bootstrap()
                return scope
              }

              list.each((item, index) => {
                creator(item, index)
              })

              list.on(EK.inserted, (index) => {
                creator(list.at(index), index)
              })
            }
            $el.removeAttr(OA.list)
            return
          }
        }
      }

      scan () {
        this.template.each((i, el) => {
          this.scanElm(el)
        })
      }
    }

    util.delegate(Scope.prototype, 'observer', ['on', 'trigger'])

    return Scope
  })()

  // el is parent of element
  class FilledScope extends Scope {
    doRender () {
      $(this.el).append(this.template)
    }

    doSetId () {
      $(this.template).attr(OA.id, this.id)
    }
  }

  class IndexedScope extends FilledScope {
    constructor (params) {
      super(params)
      this.index = params.index
    }

    doRender () {
      if (this.index === 0) {
        return $(this.el).append(this.template)
      }
      const $target = $(this.el).children(`*:nth-child(${this.index})`)
      if ($target.size() === 0) {
        throw new Error(`*:nth-child(${this.index}) not found`)
      }

      return $target.after(this.template)
    }
  }

  // el is top of elements
  class PartScope extends Scope {
    doRender () {
      $(this.el).html(this.template)
    }

    doSetId () {
      $(this.el).attr(OA.id, this.id)
    }
  }

  if (global.setImmediate) {
    me.nextTick = func => {
      global.setImmediate(decorateEventable(null, EK.tick, func))
    }
  } else {
    me.nextTick = func => {
      global.setTimeout(decorateEventable(null, EK.tick, func), 0)
    }
  }

  const decorateEventable = (scope, eventName, listener) => event => {
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

  me.onBeforeRender = () => {}
  me.onAfterRender = () => {}

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

  class Component {
    static find (name) { return Component.list[name] }

    constructor (scripts, templates, name) {
      this.scripts = scripts
      if (util.isString(templates)) {
        this.templates = templates
        this.name = name
      } else {
        this.templates = $(templates).html()
        this.name = name || $(templates).attr('id')
      }

      Component.list[this.name] = this
    }

    mixTo (el = document.createElement('div'), options = {}) {
      const scope = new PartScope({
        el: el,
        templates: this.templates,
        scripts: this.scripts,
        options: options
      })
      scope.bootstrap()
      return scope
    }

    createInto (el, options = {}) {
      const scope = new FilledScope({
        el: el,
        templates: this.templates,
        scripts: this.scripts,
        options: options
      })
      scope.bootstrap()
      return scope
    }

    createAfter (el, params) {
      const scope = this.mixTo(document.createElement('div'), params)
      $(el).after(scope.el)
      return scope
    }
  }

  Component.list = {}

  me.define = (el, handler) => new Component(handler, el)

  me.find = name => Component.find(name)

  me.Observer = util.Observer
  me.Collection = Collection
  return me
})
