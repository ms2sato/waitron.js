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

  // @see http://stackoverflow.com/questions/8403108/calling-eval-in-particular-context
  function evalInContext (js, context) {
    /* eslint-disable no-eval */
    return function () { 
      var self = context
      return eval(js)
     }.call(context)
    /* eslint-enable no-eval */
  }

  var me = function (el) {
    return {
      el: el,
      on: function (ev, func) {
        return addEventListener(this, ev, func)
      },
      update: function () {
        $(this.el).html(this.template(this))
      }
    }
  }

  function addEventListener (w, ev, fun) {
    var hand = function (e) {
      me.onBeforeEvent(w, ev, e, fun)
      var ret = fun(e)
      return me.onAfterEvent(w, ev, e, fun, ret)
    }
    if (w.el.addEventListener) {
      return w.el.addEventListener(ev, hand, true)
    }
    if (w.el.attachEvent) {
      return w.el.attachEvent(ev, hand)
    }
  };

  me.onBeforeEvent = function () {}

  me.onAfterEvent = function (w, ev, e, fun, ret) {
    console.log(ev, e, fun, ret)
    if (ret && ret.skipUpdate === true) {
      return ret.value
    }
    w.update()
    return ret
  }

  var scriptsSelector = 'script[type=waitron]'
  var scriptRegex = /<initialize>([\s\S]*)<\/initialize>/
  var templateRegex = /<template>([\s\S]*)<\/template>/
  function extractRegex (regex, text) {
    var m = regex.exec(text)
    return m[1]
  }

  function Component () {}
  Component.prototype.init = function (parent, scripts, templates) {
    var el = document.createElement('div')
    var w = me(el)
    $(parent).after(el)
    evalInContext(scripts, w)

    this.w = w
    w.template = _.template(templates)
    w.update()
  }

  Component.create = function (parent, shadows) {
    var c = new Component()
    var scripts = extractRegex(scriptRegex, shadows)
    var templates = extractRegex(templateRegex, shadows)
    c.init(parent, scripts, templates)
    return c
  }

  me.initFromScript = function (scriptEl) {
    var shadows = $(scriptEl).text()
    return Component.create(scriptEl, shadows)
  }

  me.init = function () {
    $(scriptsSelector).each(function () {
      me.initFromScript(this)
    })
  }

  return me
})
