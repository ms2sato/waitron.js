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
    return function () { return eval(js) }.call(context)
    /* eslint-enable no-eval */
  }

  var me = function (el) {
    return {
      el: el,
      on: function (ev, func) {
        return addEventListener(el, ev, func)
      },
      update: function () {
        $(this.el).html(this.template(this))
      }
    }
  }

  function addEventListener (el, ev, fun) {
    var hand = function (e) {
      me.onEvent(el, ev, e, fun)
      fun()
    }
    if (el.addEventListener) {
      return el.addEventListener(ev, hand, true)
    }
    if (el.attachEvent) {
      return el.attachEvent(ev, hand)
    }
  };

  me.onEvent = function (ev, e, fun) {
    console.log(ev, e, fun)
  }

  var scriptsSelector = 'script[type=waitron]'
  var scriptRegex = /<initialize>([\s\S]*)<\/initialize>/
  var templateRegex = /<template>([\s\S]*)<\/template>/
  function extractRegex (regex, text) {
    var m = regex.exec(text)
    return m[1]
  }

  function Component () {}
  Component.prototype.init = function(parent, shadows){
    var scripts = extractRegex(scriptRegex, shadows)
    var templates = extractRegex(templateRegex, shadows)
    var el = document.createElement('div')
    var w = me(el)
    $(parent).after(el)
    evalInContext(scripts, w)

    this.w = w
    w.template = _.template(templates)
    w.update()
  }

  me.init = function () {
    $(scriptsSelector).each(function () {
      var shadows = $(this).text()
      var component = new Component();
      component.init(this, shadows);
    })
  }

  return me
})
