const Koa = require('koa');
const http = require('http');
const path = require('path');
const lodash = require('lodash');
const convert = require('koa-convert');
const deprecate = require('depd')('koahub');
const socket = require('socket.io');

const pkg = require('./../package.json');
const config = require('./config/default.config');
const Loader = require('./lib/loader.class');
const Controller = require('./lib/controller.class');
const httpMiddleware = require('./middleware/http.middleware');
const log = require('./util/log.util');
const {isGeneratorFunction, expressMiddlewareToKoaMiddleware} = require('./util/default.util');

module.exports = class Koahub {

    constructor(options = {}) {

        // 加载全局变量
        global.koahub = pkg;

        this.koa = new Koa();
        this.options = options;
        this.init();
    }

    loadErrors() {

        // 监控错误日志
        this.koa.on("error", function (err, ctx) {
            log(err);
        });

        // 捕获promise reject错误
        process.on('unhandledRejection', function (reason, promise) {
            log(reason);
        });

        // 捕获未知错误
        process.on('uncaughtException', function (err) {
            log(err);
            if (err.message.indexOf(' EADDRINUSE ') > -1) {
                process.exit();
            }
        });
    }

    loadPaths() {

        const root = this.options.root || process.env.ROOT || process.cwd();
        const app = path.resolve(root, this.options.app || process.env.APP || 'app');

        koahub.paths = {
            app: app,
            root: root
        };
    }

    loadConfigs() {

        koahub.configs = new Loader(__dirname, config.loader.configs);
        koahub.configs = lodash.merge(koahub.configs, new Loader(koahub.paths.app, config.loader.configs));
    }

    loadUtils() {

        // config函数
        koahub.config = function (name, value) {
            switch (arguments.length) {
                case 0:
                    return koahub.configs.default;
                case 1:
                    return koahub.configs.default[name];
                case 2:
                    koahub.configs.default[name] = value;
            }
        };

        // controller继承
        koahub.controller = Controller;
    }

    loadMiddlewares() {

        koahub.middlewares = new Loader(__dirname, koahub.config('loader').middlewares);
        koahub.middlewares = lodash.merge(koahub.middlewares, new Loader(koahub.paths.app, koahub.config('loader').middlewares));

        // 自动加载中间件
        for (let key in koahub.middlewares) {
            if (!koahub.configs.middleware[key]) {
                continue;
            }
            if (koahub.configs.middleware[key] === false) {
                continue;
            }
            if (koahub.configs.middleware[key] === true) {
                this.use(koahub.middlewares[key]());
                continue;
            }
            this.use(koahub.middlewares[key](koahub.configs.middleware[key]));
        }
    }

    loadLoaders() {

        for (let key in koahub.config('loader')) {

            // 移除重复加载
            if (key === 'configs' || key === 'middlewares') {
                continue;
            }
            koahub[key] = new Loader(koahub.paths.app, koahub.config('loader')[key]);
        }
    }

    loadModules() {

        let modules = [];
        for (let key in koahub.controllers) {
            let paths = key.split('/');
            if (paths.length < 3) {
                continue;
            }
            modules.push(paths[1]);
        }
        koahub.modules = lodash.union(modules);
    }

    init() {

        this.loadErrors();
        this.loadPaths();
        this.loadConfigs();
        this.loadUtils();
        this.loadMiddlewares();
        this.loadLoaders();
        this.loadModules();
    }

    // 默认支持koa middleware
    use(fn) {

        if (isGeneratorFunction(fn)) {
            fn = convert(fn);
        }
        this.koa.use(fn);
    }

    // 支持express middleware
    useExpress(fn) {

        fn = expressMiddlewareToKoaMiddleware(fn);
        this.use(fn);
    }

    // 获取koa
    getKoa() {

        deprecate('app.getKoa() has been deprecated, please use the app.use() to use middleware!');
        return this.koa;
    }

    // 获取socket
    getSocket() {
        return socket(this.getServer());
    }

    // 获取server
    getServer() {

        const server = http.Server(this.koa.callback());
        return this.server = server;
    }

    loadHttpMiddlewares() {

        // 加载http中间件
        this.use(httpMiddleware().skip(function (ctx) {

            const path = ctx.path;
            const urlSuffix = koahub.config('url_suffix');

            if (urlSuffix) {
                const regexp = new RegExp(`${urlSuffix}$`);
                if (regexp.test(path)) {
                    ctx.path = path.substr(0, path.lastIndexOf(urlSuffix));
                    return false;
                }
                return true;
            }

            // path验证，资源文件跳过中间件
            if (/[^\/]+\.+\w+$/.test(path)) {
                return true;
            }

            // path验证，无效跳过中间件
            if (/\/\//.test(path)) {
                return true;
            }

            return false;
        }));
    }

    run(port) {

        this.loadHttpMiddlewares();

        if (!port) {
            port = koahub.config('port');
        }

        this.start(port);
    }

    start(port) {

        if (this.server) {
            this.server.listen(port);
        } else {
            this.getServer().listen(port);
        }

        this.started(port);
    }

    started(port) {

        log(`Koahub Version: ${koahub.version}`);
        log(`Koahub Website: http://js.koahub.com`);
        log(`Server Enviroment: ${process.env.NODE_ENV || 'development'}`);
        log(`Server running at: http://127.0.0.1:${port}`);
    }
}