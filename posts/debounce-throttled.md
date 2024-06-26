---
title: 防抖 VS 节流
date: 2024-05-20
tags: [防抖, 节流, 性能优化]
head:
  - - meta
    - name: description
      content: 简述防抖与节流的区别，附带部分示例
  - - meta
    - name: keywords
      content: 防抖 节流 前端 性能优化
---

简述防抖与节流的区别，附带部分示例

---

## 一、定义

防抖和节流本质对高频率执行代码的一种优化。总所周知浏览器的`mousemove`、`scroll`等事件在触发时会不断调用绑定的回调函数，造成前端性能下降。为了优化性能，就需要对这类事件绑定的回调函数进行限制，限制一段时间内的调用次数。对此有两种优化方案，就是**防抖（debounce）**和**节流（throttle）**。

定义

- 防抖：n 秒后在执行该事件，若在 n 秒内被重复触发，则重新计时。
- 节流：n 秒内只运行一次，若在 n 秒内重复触发，只有一次生效。

一个经典比喻，假设一部电梯就有防抖和节流两种运行策略，并且不考虑容量限制，那么：

- 从第一个进电梯的人开始计时，等待 n 秒时间，在这 n 秒内的时间里，如果又有人进入电梯，就重新计时 n 秒，直到 n 秒计时完成且计时过程没有人进入电梯就开始运送，这是防抖。
- 从第一个进电梯的人开始计时，n 秒后准时运送一次，这是节流。

## 二、代码实现

### 防抖

基础版本实现：

```js
function debounce(func, wait = 500) {
  let timeout

  return function () {
    let context = this // 保存this指向
    let args = arguments // event对象

    clearTimeout(timeout)
    timeout = setTimeout(() => {
      func.apply(context, args)
    }, wait)
  }
}
```

如果需要立即执行，则可以增加第三个参数用于判断：

```js
function debounce(func, wait = 500, immediate = false) {
  let timeout

  return function () {
    let context = this
    let args = arguments

    if (timeout) clearTimeout(timeout) // timeout 不为null
    if (immediate) {
      let callNow = !timeout // 第一次会立即执行，以后只有事件执行后才会再次触发
      timeout = setTimeout(function () {
        timeout = null
      }, wait)
      if (callNow) {
        func.apply(context, args)
      }
    } else {
      timeout = setTimeout(function () {
        func.apply(context, args)
      }, wait)
    }
  }
}
```

---

### 节流

节流有两种写法：时间戳和定时器

时间戳写法如下，事件会立即执行，停止触发后无法再次执行

```js
function throttled1(fn, delay = 500) {
  let oldtime = Date.now()
  return function (...args) {
    let newtime = Date.now()
    if (newtime - oldtime >= delay) {
      fn.apply(null, args)
      oldtime = Date.now()
    }
  }
}
```

定时器写法如下，delay 毫秒后第一次执行，事件停止触发后会再执行一次。

```js
function throttled2(fn, delay = 500) {
  let timer = null
  return function (...args) {
    if (!timer) {
      timer = setTimeout(() => {
        fn.apply(this, args)
        timer = null
      }, delay)
    }
  }
}
```

当然由于 JS 事件循环的机制，定时器并不是总能精确的在指定延时后执行回调函数，所以我们可以将以上两种写法结合，实现一个更精确的节流。

```js
function throttled(fn, delay) {
  let timer = null
  let starttime = Date.now()
  return function () {
    let curTime = Date.now() // 当前时间
    let remaining = delay - (curTime - starttime) // 从上一次到现在，还剩下多少多余时间
    let context = this
    let args = arguments
    clearTimeout(timer)
    if (remaining <= 0) {
      fn.apply(context, args)
      starttime = Date.now()
    } else {
      timer = setTimeout(fn, remaining)
    }
  }
}
```

## 三、应用场景

防抖在连续的事件，只需触发一次回调的场景有：

- 搜索框搜索输入。只需用户最后一次输入完，再发送请求
- 手机号、邮箱验证输入检测
- 窗口大小 resize。只需窗口调整完成后，计算窗口大小。防止重复渲染。

节流在间隔一段时间执行一次回调的场景有：

- 滚动加载，加载更多或滚到底部监听
- 搜索框，搜索联想功能

---

[内容参考](https://vue3js.cn/interview/JavaScript/debounce_throttle.html#%E4%BA%8C%E3%80%81%E5%8C%BA%E5%88%AB)
