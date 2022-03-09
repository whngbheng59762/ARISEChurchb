import Koa from "koa";
import path from "path";
import http from "http";
import body from "koa-body";
import lodash from "lodash";
import convert from "koa-convert";
import logger from "koa-logger";
import favicon from "koa-favicon";
import staticCache from "koa-static-cache";
import packageFile from "./../package.json";
import Loader from "./lib/loader.class";
import Controller from "./lib/controller.class";
import config from "./config/default.config";
import httpMiddleware from "./middleware/http.middleware";
import corsMiddleware from "./middleware/cors.middleware";
import sessionMiddleware from "./middleware/session.middleware";
import log, {debug} from "./util/log.util";
import {isGeneratorFunction} from "./util/default.util";

//rewite promise, bluebird is more faster
global.Promise = require('bluebird');
require('babel-runtime/core-js/promise').default = Promise;

export default class Koahub {

    constructor() {

        // 加载全局变量
        global.koahub = packageFile;
        // new Koa()
        koahub.app = new Koa();

        this.init();
    }

    loadErrors() {

        // 监控错误日志
        koahub.app.on("error", function (err, ctx) {
            debug(err);
        });

        // 捕获promise reject错误
        process.on('unhandledRejection', function (reason, promise) {
            debug(reason);
        });

        // 捕获未知错误
        process.on('uncaughtException', function (err) {
            debug(err);

            if (err.message.indexOf(' EADDRINUSE ') > -1) {
                process.exit();
            }
        });
    }

    loadPaths() {

        const rootPath = process.cwd();
        const runtimeFile = process.mainModule.filename;
        const runtimePath = path.dirname(runtimeFile);
        const runtimeName = path.relative(rootPath, runtimePath);

        koahub.paths = {
            rootPath: rootPath,
            runtimeFile: runtimeFile,
            runtimePath: runtimePath,
            runtimeName: runtimeName
        };
    }

    loadConfigs() {

        // Object.assign({}, config) 创建新对象，不允许覆盖config
        koahub.configs = new Loader(koahub.paths.runtimePath, config.loader.configs);
        koahub.configs.default = lodash.merge(Object.assign({}, config), koahub.configs.default);
    }

    loadUtils() {

        // config函数
        koahub.config = function (name, value) {
            if (name == undefined) {
                return koahub.configs.default;
            } else {
                if (value == undefined) {
                    return koahub.configs.default[name];
                } else {
                    koahub.configs.default[name] = value;
                }
            }
        };

        // controller继承
        koahub.controller = Controller;
    }

    loadLoaders() {

        for (let key in koahub.config('loader')) {

            // 移除configs重复加载
            if (key == 'configs') {
                continue;
            }
            koahub[key] = new Loader(koahub.paths.runtimePath, koahub.config('loader')[key]);
        }

        // 加载模块
        this.loadModules();
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

    loadMiddlewares() {

        // log middleware
        if (koahub.config('logger')) {
            this.use(logger());
        }

        // favicon middleware
        if (koahub.config('favicon')) {
            if (lodash.isString(koahub.config('favicon'))) {
                this.use(favicon(koahub.config('favicon')));
            } else {
                throw new Error('Favicon must be a path');
            }
        }

        // cors middleware
        if (koahub.config('cors')) {
            if (lodash.isPlainObject(koahub.config('cors'))) {
                this.use(corsMiddleware(koahub.config('cors')));
            } else {
                if (lodash.isBoolean(koahub.config('cors'))) {
                    this.use(corsMiddleware());
                } else {
                    throw new Error('Cors must be a PlainObject or Boolean');
                }
            }
        }

        // session middleware
        if (koahub.config('session')) {
            if (lodash.isPlainObject(koahub.config('session'))) {
                this.use(sessionMiddleware(koahub.config('session')));
            } else {
                if (lodash.isBoolean(koahub.config('session'))) {
                    this.use(sessionMiddleware());
                } else {
                    throw new Error('Session must be a PlainObject or Boolean');
                }
            }
        }

        // static middleware
        if (koahub.config('static')) {
            if (lodash.isPlainObject(koahub.config('static'))) {
                const {dir = '', options = {}} = koahub.config('static');
                this.use(staticCache(dir, options));
            } else {
                throw new Error('Static must be a PlainObject');
            }
        }
    }

    init() {

        this.loadErrors();
        this.loadPaths();
        this.loadConfigs();
        this.loadUtils();
        this.loadLoaders();
        this.loadMiddlewares();
    }

    // 支持generator
    use(fn) {

        if (isGeneratorFunction(fn)) {
            fn = convert(fn);
        }
        koahub.app.use(convert(fn));
    }

    // 支持soket.io
    getServer() {

        const server = http.Server(koahub.app.callback());
        return this.server = server;
    }

    // 支持自定义中间件
    getKoa() {

        return koahub.app;
    }

    loadHttpMiddlewares() {

        // 加载body中间件
        if (koahub.config('body')) {
            if (lodash.isPlainObject(koahub.config('body'))) {

                this.use(body(koahub.config('body')));
                this.use(async function (ctx, next) {
                    if (!ctx.request.body.files) {
                        ctx.post = ctx.request.body;
                    } else {
                        ctx.post = ctx.request.body.fields;
                        ctx.file = ctx.request.body.files;
                    }
                    await next();
                });
            } else {
                throw new Error('Body options must be a PlainObject');
            }
        }

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