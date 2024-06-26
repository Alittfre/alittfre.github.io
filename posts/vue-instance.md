---
title: new Vue()之后发生了什么？
date: 2024-05-15
tags: [Vue]
head:
  - - meta
    - name: description
      content: new Vue()之后发生了什么
  - - meta
    - name: keywords
      content: Vue 前端
---

通过阅读源码了解 new Vue()后发生的事情

---

# 一、从源码分析

Vue 的构造函数在 `src\core\instance\index.ts`

```ts
function Vue(options) {
  if (__DEV__ && !(this instanceof Vue)) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options) //构造函数调用_init方法初始化Vue实例。options是用户传递的配置项，如data, methods等
}

//@ts-expect-error Vue has function type
initMixin(Vue) // 定义_init方法
//@ts-expect-error Vue has function type
stateMixin(Vue) // 状态mixin，定义$set $get $delete $watch等
//@ts-expect-error Vue has function type
eventsMixin(Vue) // 事件mixin，定义$on $off $emit等
//@ts-expect-error Vue has function type
lifecycleMixin(Vue) // 生命周期mixin，定义_update  $forceUpdate  $destroy
//@ts-expect-error Vue has function type
renderMixin(Vue) // render函数mixin，返回虚拟dom
```

以上可以看到有 5 个 `mixin` 初始化方法。首先进入 `initMixin` 方法，源码位置`src\core\instance\init.ts`

### initMixin 方法

```ts
export function initMixin(Vue: typeof Component) {
  Vue.prototype._init = function (options?: Record<string, any>) {
    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (__DEV__ && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to mark this as a Vue instance without having to do instanceof
    // check
    vm._isVue = true
    // avoid instances from being observed
    vm.__v_skip = true
    // effect scope
    vm._scope = new EffectScope(true /* detached */)
    // #13134 edge case where a child component is manually created during the
    // render of a parent component
    vm._scope.parent = undefined
    vm._scope._vm = true
    // merge options
    // 判断初始化对象是否为组件并合并options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options as any)
    } else {
      // 否则合并Vue属性
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor as any),
        options || {},
        vm,
      )
    }
    /* istanbul ignore else */
    if (__DEV__) {
      // 初始化Proxy拦截器
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    initLifecycle(vm) // 初始化组件生命周期标志位
    initEvents(vm) // 初始化组件事件侦听
    initRender(vm) // 初始化render方法
    callHook(vm, 'beforeCreate', undefined, false /* setContext */) // beforeCreate生命周期钩子
    initInjections(vm) // 在初始化data、props之前初始化依赖注入内容
    initState(vm) // 初始化props/data/method/watch/methods
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created') // created生命周期钩子

    /* istanbul ignore if */
    if (__DEV__ && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el) // 挂载dom元素
    }
  }
}
```

阅读以上源码可知：

- `beforeCreate`之前，会初始化组件生命周期标志位和组件事件侦听，此时还无法访问 data 和 props，初始化未完成。
- `created`时数据初始化完成，能访问 data 和 props，但是 dom 还没有挂载，无法访问 dom 元素。

接下来查看`stateMixin`，源码位置：`src\core\instance\state.js`。

### stateMixin 方法

```ts
export function stateMixin(Vue: typeof Component) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  // 定义属性描述对象 dataDef 和 propsDef
  const dataDef: any = {}
  dataDef.get = function () {
    return this._data
  }
  const propsDef: any = {}
  propsDef.get = function () {
    return this._props
  }
  if (__DEV__) {
    dataDef.set = function () {
      warn('Avoid replacing instance root $data. ' + 'Use nested data properties instead.', this)
    }
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)
  // $set 和 $delete 方法
  Vue.prototype.$set = set
  Vue.prototype.$delete = del

  Vue.prototype.$watch = function (
    expOrFn: string | (() => any),
    cb: any,
    options?: Record<string, any>,
  ): Function {
    const vm: Component = this
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    options.user = true
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      const info = `callback for immediate watcher "${watcher.expression}"`
      pushTarget()
      invokeWithErrorHandling(cb, vm, [watcher.value], vm, info)
      popTarget()
    }
    return function unwatchFn() {
      watcher.teardown()
    }
  }
}
```

阅读以上源码可知：

- 两个属性描述对象 `dataDef` 和 `propsDef`，分别用于定义 `$data` 和 `$props` 属性。
- 为 Vue.prototype 添加了`$set`和 `delete`方法。这两个方法分别是 Vue 提供的用于动态添加和删除响应式属性的方法：

### eventsMixin 方法

```ts
export function eventsMixin(Vue: typeof Component) {
  const hookRE = /^hook:/
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    //事件名数组
    if (isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
      //单个事件名
    } else {
      ;(vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }

  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    function on() {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    on.fn = fn
    //递归调用
    vm.$on(event, on)
    return vm
  }

  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // all
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // 同样支持事件名数组
    // array of events
    if (isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn)
      }
      return vm
    }
    // specific event
    const cbs = vm._events[event!]
    if (!cbs) {
      return vm
    }
    if (!fn) {
      vm._events[event!] = null
      return vm
    }
    // specific handler
    let cb
    let i = cbs.length
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }
  //事件触发
  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    if (__DEV__) {
      const lowerCaseEvent = event.toLowerCase()
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
            `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
            `Note that HTML attributes are case-insensitive and you cannot use ` +
            `v-on to listen to camelCase events when using in-DOM templates. ` +
            `You should probably use "${hyphenate(event)}" instead of "${event}".`,
        )
      }
    }
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      const info = `event handler for "${event}"`
      for (let i = 0, l = cbs.length; i < l; i++) {
        invokeWithErrorHandling(cbs[i], vm, args, vm, info)
      }
    }
    return vm
  }
}
```

阅读以上源码可知：

- `$on` 和 `$off`方法用于在 Vue 实例上监听自定义事件。它可以接收一个事件名或事件名数组，以及一个回调函数。

### lifecycleMixin 方法

```ts
export function lifecycleMixin(Vue: typeof Component) {
  //_update 将VNode转换为实际 DOM
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    const vm: Component = this
    const prevEl = vm.$el
    const prevVnode = vm._vnode
    const restoreActiveInstance = setActiveInstance(vm)
    vm._vnode = vnode
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    if (!prevVnode) {
      // initial render
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)
    } else {
      // updates
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
    restoreActiveInstance()
    // update __vue__ reference
    if (prevEl) {
      prevEl.__vue__ = null
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well
    let wrapper: Component | undefined = vm
    while (
      wrapper &&
      wrapper.$vnode &&
      wrapper.$parent &&
      wrapper.$vnode === wrapper.$parent._vnode
    ) {
      wrapper.$parent.$el = wrapper.$el
      wrapper = wrapper.$parent
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
  }

  Vue.prototype.$forceUpdate = function () {
    const vm: Component = this
    if (vm._watcher) {
      vm._watcher.update()
    }
  }

  Vue.prototype.$destroy = function () {
    const vm: Component = this
    if (vm._isBeingDestroyed) {
      return
    }
    callHook(vm, 'beforeDestroy')
    vm._isBeingDestroyed = true
    // remove self from parent
    const parent = vm.$parent
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm)
    }
    // teardown scope. this includes both the render watcher and other
    // watchers created
    vm._scope.stop()
    // remove reference from data ob
    // frozen object may not have observer.
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--
    }
    // call the last hook...
    vm._isDestroyed = true
    // invoke destroy hooks on current rendered tree
    vm.__patch__(vm._vnode, null)
    // fire destroyed hook
    callHook(vm, 'destroyed')
    // turn off all instance listeners.
    vm.$off()
    // remove __vue__ reference
    if (vm.$el) {
      vm.$el.__vue__ = null
    }
    // release circular reference (#6759)
    if (vm.$vnode) {
      vm.$vnode.parent = null
    }
  }
}
```

阅读以上源码可知：

- `_update`方法负责将虚拟 DOM (VNode) 转换为实际 DOM，并更新组件的 DOM 表现。`__patch__`方法在初次渲染和更新 VNode 时都会被调用。
- `$destroy` 方法执行过程：
  - beforeDestroy 钩子：在组件销毁前调用 beforeDestroy 钩子。
  - 移除自身：从父组件的 $children 数组中移除自身。
  - 停止所有观察者：停止与组件相关的所有观察者。
  - 减少观察者计数：如果组件的数据对象有观察者，减少其计数。
  - 销毁渲染树：调用 **patch** 方法销毁当前的渲染树。
  - 触发 destroyed 钩子：在组件销毁后调用 destroyed 钩子。
  - 取消事件监听：调用 $off 方法取消所有事件监听。
  - 解除 DOM 引用：将组件的 DOM 元素的 **vue** 引用设为 null。
  - 释放循环引用：将组件的 VNode 的父节点引用设为 null。

### renderMixin 方法

```ts
export function renderMixin(Vue: typeof Component) {
  // install runtime convenience helpers
  installRenderHelpers(Vue.prototype)
  //$nextTick方法
  Vue.prototype.$nextTick = function (fn: (...args: any[]) => any) {
    return nextTick(fn, this)
  }
  // _render方法生成VNode
  Vue.prototype._render = function (): VNode {
    const vm: Component = this
    const { render, _parentVnode } = vm.$options

    if (_parentVnode && vm._isMounted) {
      vm.$scopedSlots = normalizeScopedSlots(
        vm.$parent!,
        _parentVnode.data!.scopedSlots,
        vm.$slots,
        vm.$scopedSlots,
      )
      if (vm._slotsProxy) {
        syncSetupSlots(vm._slotsProxy, vm.$scopedSlots)
      }
    }

    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    vm.$vnode = _parentVnode!
    // render self
    const prevInst = currentInstance
    const prevRenderInst = currentRenderingInstance
    let vnode
    try {
      setCurrentInstance(vm)
      currentRenderingInstance = vm
      vnode = render.call(vm._renderProxy, vm.$createElement)
    } catch (e: any) {
      handleError(e, vm, `render`)
      // return error render result,
      // or previous vnode to prevent render error causing blank component
      /* istanbul ignore else */
      if (__DEV__ && vm.$options.renderError) {
        try {
          vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e)
        } catch (e: any) {
          handleError(e, vm, `renderError`)
          vnode = vm._vnode
        }
      } else {
        vnode = vm._vnode
      }
    } finally {
      currentRenderingInstance = prevRenderInst
      setCurrentInstance(prevInst)
    }
    // if the returned array contains only a single node, allow it
    if (isArray(vnode) && vnode.length === 1) {
      vnode = vnode[0]
    }
    // return empty vnode in case the render function errored out
    if (!(vnode instanceof VNode)) {
      if (__DEV__ && isArray(vnode)) {
        warn(
          'Multiple root nodes returned from render function. Render function ' +
            'should return a single root node.',
          vm,
        )
      }
      vnode = createEmptyVNode()
    }
    // set parent
    vnode.parent = _parentVnode
    return vnode
  }
}
```

阅读以上源码可知：

- 渲染函数：\_render 方法调用组件的渲染函数生成虚拟 DOM (VNode)。
- 作用域插槽：在渲染过程中处理作用域插槽，确保插槽内容正确传递。
- 错误处理：在渲染过程中捕获异常，如果有 renderError 方法，则调用它进行错误处理，否则返回之前的 VNode 以避免组件渲染为空。
- 单一根节点：确保渲染函数返回的 VNode 是单一根节点，如果返回多个根节点，则在开发环境中给出警告。
- 空 VNode：如果渲染函数出错或返回无效 VNode，则返回一个空的 VNode。

# 二、结论

new Vue 的时候调用会调用\_init 方法，并进行以下操作：

- 定义 `$set`、`$get` 、`$delete`、`$watch` 等方法
- 定义 `$on`、`$off`、`$emit`、`$off`等事件
- 定义 `_update`、`$forceUpdate`、`$destroy`生命周期
- 调用`$mount`进行页面的挂载
- 执行 `_render`生成 VNode
- \_update 将虚拟 DOM 生成真实 DOM 结构，并且渲染到页面中。
