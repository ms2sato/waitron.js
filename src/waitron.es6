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

  // @see http://qiita.com/Layzie/items/465e715dae14e2f601de
  function is (type, obj) {
    const clas = Object.prototype.toString.call(obj).slice(8, -1)
    return obj !== undefined && obj !== null && clas === type
  }

  function isString (o) {
    return is('String', o)
  }

  function isFunction (o) {
    return is('Function', o)
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

  function delegate (prototype, to, name) {
    if (Array.isArray(name)) {
      return each(name, (n) => {
        delegate(prototype, to, n)
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
      each(this.listenersHash[name], (listener) => {
        listener.apply(this, arguments)
      })
    }
  }

  // me ////////////////////////////////////////////////
  const me = function waitron (obj) {
    if (Array.isArray(obj)) {
      return new Collection(obj)
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

  class Collection extends Observer {
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
      onCollectionInserted(this, index, models)
    }

    move () {}

    remove (models) {}
    clear () {}
    reset (models) {}
    sort (comparator) {}
    swap (lindex, rindex) {}

    each (handler) {
      each(this.models, handler)
    }
  }

  // scope ////////////////////////////////////////////////
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

  function listenate (o, checker = function () { return true }) {
    const ret = []
    each(o, (value, key) => {
      if (!checker(key, value, o)) return

      log(`lisnated: ${key}`)

      listenateProp(o, key)
      ret.push(key)
    })
    return ret
  }

  const scopeRegex = /\{([\s\S]*)\}/
  function getChangeEventName (prop) { return `change:${prop}` }

  const Scope = (() => {
    function addEventListener (scope, eventName, listener, el = scope.el) {
      if (el.addEventListener) {
        return el.addEventListener(eventName, decorateEventable(scope, eventName, listener), true)
      }
      if (el.attachEvent) {
        return el.attachEvent(eventName, decorateEventable(scope, eventName, listener))
      }
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
        this.unlistenatedProperties = [] // for includes unlistenatedProperties
        this.unlistenatedProperties = Object.getOwnPropertyNames(this)

        if (!isFunction(this.scripts)) {
          throw new Error('script must be a function')
        }

        this.scripts.bind(this).call(this, this.options, this)

        listenate(this, (key, value, o) => {
          return !isFunction(value) && !this.unlistenatedProperties.includes(key)
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
          this.trigger('rendered')
          me.onAfterRender.call(self)
        })
      }

      find () {
        const $el = $(this.el)
        return $el.find.apply($el, arguments)
      }

      prop (key) {
        const p = this[key]
        if (isFunction(p)) return p()
        return p
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
          self.on(getChangeEventName(prop), (e) => {
            $el.text(self[prop])
          })
          $el.text(self[prop])
        }

        each(el.attributes, (val, key) => {
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

          self.on(getChangeEventName(key), () => {
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
          } else if (name === 'w:list') {
            const list = this[key]
            const $itemEl = $($el.children())
            $itemEl.remove()

            const typeName = $itemEl.attr('w:type')
            if (typeName) {
              $itemEl.removeAttr('w:type')
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

              list.on('inserted', (index) => {
                creator(list.at(index), index)
              })
            }
            $el.removeAttr('w:list')
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

    delegate(Scope.prototype, 'observer', ['on', 'trigger'])

    return Scope
  })()

  // el is parent of element
  class FilledScope extends Scope {
    doRender () {
      $(this.el).append(this.template)
    }

    doSetId () {
      $(this.template).attr('w:id', this.id)
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
      $(this.el).attr('w:id', this.id)
    }
  }

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
  me.onAfterRender = function () {}

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
      log(`triggered ${getChangeEventName(prop)}`)
      o.trigger(getChangeEventName(prop))
    })
  }

  function onCollectionInserted (c, index, value) {
    log('onCollectionInserted', arguments)

    me.tickContext.push(`${c.id}@inserted`, () => {
      c.trigger('inserted', index, value)
    })
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
      if (isString(templates)) {
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

  me.onBeforeEvent(null, 'bootstrap', null, null)
  // something on boot?
  me.onAfterEvent(null, 'bootstrap', null, null)

  me.Observer = Observer
  me.Collection = Collection
  return me
})
