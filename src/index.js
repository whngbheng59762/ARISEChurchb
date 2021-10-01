import path from "path";
import http from "http";
import Koa from "koa";
import logger from "koa-logger";
import favicon from "koa-favicon";
import lodash from "lodash";
import colors from "colors/safe";
import packageFile from "./../package.json";
import Loader from "./lib/loader.class";
import Hook from "./lib/hook.class";
import Http from "./data/http.class";
import Watcher from "./lib/watcher.class";
import config from "./config/index.config";
import configDefault from "./config/default.config";
import {httpMiddleware} from "./middleware/http.middleware";
import {debug as captureDebug} from "./util/log.util";

export default class {

    constructor(options = {}) {

        // 加载全局变量
        global.koahub = lodash.merge({}, packageFile);
        // new Koa()
        koahub.app = new Koa();

        this.init();
    }

    loadConfigs() {

        koahub.configs = new Loader(configDefault.loader.config);
        // 优化config
        koahub.config = function (name) {
            if (name == undefined) {
                return Object.assign(config, koahub.configs.index);
            } else {
                return Object.assign(config, koahub.configs.index)[name];
            }
        };
    }

    loadPaths() {

        const rootPath = process.cwd();
        const appName = configDefault.app;
        const runtime = configDefault.runtime;
        const appPath = path.resolve(rootPath, appName);
        const runtimePath = path.resolve(rootPath, runtime);

        koahub.paths = {
            rootPath: rootPath,
            appName: appName,
            appPath: appPath,
            runtimeName: runtime,
            runtimePath: runtimePath
        };
    }

    loadWatcher(paths) {

        // watch依赖config
        if (koahub.config('watch_on')) {
            new Watcher(paths);
        }
    }

    loadControllers() {

        // controller依赖http
        koahub.http = Http;
        koahub.controllers = new Loader(configDefault.loader.controller);
    }

    loadHooks() {

        koahub.hook = new Hook();
    }

    loadUtils() {

        koahub.utils = new Loader(configDefault.loader.util);
    }

    loadModels() {

        koahub.models = new Loader(configDefault.loader.model);
    }

    loadServices() {

        koahub.services = new Loader(configDefault.loader.service);
    }

    loadMiddlewares() {

        // log middleware
        if (koahub.config('log_on')) {
            koahub.app.use(logger());
        }

        // favicon middleware
        koahub.app.use(favicon(koahub.config('favicon')));
    }

    init() {

        this.loadConfigs();
        this.loadPaths();
        this.loadControllers();
        this.loadModels();
        this.loadServices();
        this.loadUtils();
        this.loadHooks();
        this.loadMiddlewares();
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

    handleError() {

        // 监控错误日志
        koahub.app.on("error", function (err, ctx) {
            captureDebug(err);
        });

        // 捕获promise reject错误
        process.on('unhandledRejection', function (reason, promise) {
            captureDebug(reason);
        });

        // 捕获未知错误
        process.on('uncaughtException', function (err) {
            captureDebug(err);
        });
    }

    loadHttpMiddlewares() {

        // 加载http中间件
        koahub.app.use(httpMiddleware().skip(function (ctx) {

            const path = ctx.path;

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
        this.handleError();

        if (!port) {
            port = koahub.config('port');
        }

        if (this.server) {
            this.server.listen(port, this.started(port));
        } else {
            this.getServer().listen(port, this.started(port));
        }
    }

    started(port) {

        this.loadWatcher(koahub.paths);

        console.log(colors.green(`[Koahubjs] Koahubjs version: ${koahub.version}`));
        console.log(colors.green(`[Koahubjs] Koahubjs website: http://js.koahub.com`));
        console.log(colors.green(`[Koahubjs] Server running at http://127.0.0.1:${port}`));
    }
}