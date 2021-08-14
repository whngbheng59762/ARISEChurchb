## 介绍

KoaHub.js -- 基于 Koa.js 平台的 Node.js web 快速开发框架。可以直接在项目里使用 ES6/7（Generator Function, Class, Async & Await）等特性，借助 Babel 编译，可稳定运行在 Node.js 环境上。


```js
//base controller, admin/controller/base.controller.js
export default class extends koahub.http{

    constructor() {
        super();
        console.log('base constructor');
    }

    isLogin() {
        console.log('base isLogin');
    }
}

//index controller, admin/controller/index.controller.js
import base from "./base.controller";
export default class extends base{

    constructor() {
        super();
        console.log('index constructor');
    }

    index() {
        super.view(1);
    }
    
    index2() {
        super.json(1,2);
    }
}
```

项目中可以使用 ES6/7 里的所有特性，借助 Babel 编译，可以稳定运行在 >=0.12.0 的 Node.js 环境中。

## 特性

* 支持koa全部中间件
* 支持使用 ES2015+ 全部特性来开发项目
* 支持断点调试 ES2015+ 项目
* 支持多种项目结构和多种项目环境
* 支持多级 Controller
* 支持自动加载
* 支持钩子机制
* 支持Socket.io
* ...

## 安装

```sh
npm install koahubjs --save
```

## 创建启动文件

```sh
// src/index.js启动文件
import Koahub from "koahubjs";

//默认app是项目目录
const app = new Koahub();

app.getKoa();获取koa实例化，支持自定义koa中间件
app.getServer();获取server实例化，支持socket.io

app.run();
```

## 目录结构

```sh
// 推荐目录结构
app
--addon
--config
--controller
--data
--model
--util
node_modules
src
--addon
--config
--controller
--data
--model
--util
--index.js
package.json
```

## 配置
```sh
// src/config/index.config.js
export default {
    port: 3000,
    default_module: 'admin'
}

以下为默认配置
//启动端口
port: 3000,

//项目目录
app_path: 'app',

//默认模块，控制器，操作
default_module: 'home',
default_controller: 'index',
default_action: 'index',

//http日志
log_on: true,

//favicon设置
favicon: 'www/public/favicon.ico',

//自动加载配置
loader: {
    "controller": [{
        root: 'app/controller',
        suffix: '.controller.js',
        prefix: '/',
    }, {
        root: 'app/addon',
        suffix: '.controller.js',
        prefix: '/addon/',
        filter: [/\w*\/controller\//]
    }],
    "util": [{
        root: 'app/util',
        suffix: '.util.js'
    }, {
        root: 'app/addon',
        suffix: '.util.js',
        filter: [/\w*\/util\//]
    }],
    "model": [{
        root: 'app/model',
        suffix: '.model.js'
    }, {
        root: 'app/addon',
        suffix: '.model.js',
        filter: [/\w*\/model\//]
    }],
    "config": [{
        root: 'app/config',
        suffix: '.config.js'
    }, {
        root: 'app/addon',
        suffix: '.config.js',
        filter: [/\w*\/config\//]
    }]
}

```

## 开始应用

```sh
npm run compile
npm run start
```

启动信息:

```text
[Koahubjs] Koahubjs version: 0.2.1
[Koahubjs] Koahubjs website: http://js.koahub.com
[Koahubjs] Server running at http://127.0.0.1:3000
```


## 官网
[KoaHub.js官网](http://js.koahub.com)
