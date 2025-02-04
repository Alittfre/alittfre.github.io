---
title: 一张JS梗图的分析
date: 2024-5-13
tags: [JavaScript, meme]
head:
  - - meta
    - name: description
      content: Thanks for inventing JavaScript😄
  - - meta
    - name: keywords
      content: JS JavaScript meme
---

Thanks for inventing JavaScript😄

---

最近又刷到了这张有关 JS 的 meme，正好这次就来详细看看。

![meme](/post_pic/js-meme_1.webp)

---

```js
typeof NaN
// number
```

根据 MDN 的说明，尽管 NaN 代表非数字的值（Not-a-Number），但它实际上表示的是不在 number 类型里面的“无效”数字。这里需要说明的是，JS 中的 number 类型其实都是浮点类型，没有整数，且浮点的标准是基于 IEEE 754 标准实现的，所以这严格来说上不能是 JS 的锅。

---

```js
9999999999999999
// 10000000000000000
```

这里的数字超出了 namber 类型的最大值（Number.MAX_SAFE_INTEGER），所以被储存为了最接近的值。

---

```js
0.5 + 0.1 == 0.6 // true
0.1 + 0.2 == 0.3 // false
```

这里还是因为 IEEE 754 的精度问题，这里举一个十进制的例子 1÷3=0.333......，数学上可以表示 0.333...无限循环小数，但是对于计算机来说，一个无限循环的小数再大的存储空间也存不下来，于是只能取近似值存储。
详细信息可以参考[Javascript 数字精度丢失](https://vue3js.cn/interview/JavaScript/loss_accuracy.html)。

---

```js
Math.max() //-Infinity
Math.min() // Infinity
```

这里其实是因为 max 方法的作用是返回输入参数的最大值，如果没有值就返回-Infinity，可以理解为因为要找最大值，所以要预先设置一个无限小的值兜底，min 方法同理。

---

<!-- prettier-ignore -->
```js
[] + [] // “”
```

这里是因为加法运算只能运算 number 和 string 类型。而数组是对象，运算时需要转换为上述两种类型，通过先后调用对象的 valueOf 和 toString 方法实现。空数组调用 toString 后返回的就是空字符串。

<!-- prettier-ignore -->
```js
[] + {} // “[object Object]”
```

和上面一样，空对象调用 toString 方法的是字符串[object Object]

---

<!-- prettier-ignore -->
```js
{} + [] // 0
```

那这个应该理所应当的返回和上一个表达式一样的值吧，为什么又不一样？其实这里的{}已经不是空对象了，而是一个空代码块，所以它实际等价于+[]

---

```js
true + true + true === 3 // true
true - true // 0
```

看到这里这两个就很好理解了，true 被转换为了数字 1。

---

```js
true == 1 // true
true === 1 // false
```

这里涉及到了\==和\=\==的区别，\==会将两边的值进行类型转换进行比较，而\=\==则不会。在实际开发时推荐使用\=\==进行判断。

---

<!-- prettier-ignore -->
```js
(!+[] + [] + ![]).length // 9
```

这里我们把括号里的内容拆成三部分

```js
!+[] + [] + ![]
```

先看前后两部分：

!+[]：这里的 + 是一元加法运算符，会将 [] 转为数字 0，数字 0 再被 ! 布尔求反后得到 true。

![]：空数组转换为布尔后统一为 true，然后 ! 操作符将其转换为 false。

现在加起来就是 true + [] + false 中间的 [] 遇到了二元加法运算符，会被转换为空字符串，前后的布尔值也会被转换为字符串形式的"true"和"false"。最后加起来就是 "true" + "" + "false" = "truefalse"

---

```js
9 + “1” // “91”
91 - “1” // 90
```

这里加法和减法的转换逻辑不同，加法遇到字符串会将另一个运算元也转换为字符串。而减法则会将字符串转换为数字。
