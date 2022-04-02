import {getModuleControllerAction, urlObjToParam} from "./../../src/util/http.util";
import assert from "assert";
import Koahub from "./../../src";

describe('http util', () => {

    let app;

    before(function () {
        app = new Koahub();
    });

    describe('getModuleControllerAction', () => {
        it('path / return home/index/index', () => {
            assert.deepEqual(getModuleControllerAction('/'), {
                module: 'home',
                controller: 'index',
                action: 'index'
            });
        });

        it('path /home return home/index/index', () => {
            assert.deepEqual(getModuleControllerAction('/'), {
                module: 'home',
                controller: 'index',
                action: 'index'
            });
        });

        it('path /home/index return home/index/index', () => {
            assert.deepEqual(getModuleControllerAction('/'), {
                module: 'home',
                controller: 'index',
                action: 'index'
            });
        });

        it('path /home/index/index return home/index/index', () => {
            assert.deepEqual(getModuleControllerAction('/'), {
                module: 'home',
                controller: 'index',
                action: 'index'
            });
        });

        it('path /admin return home/index/index', () => {
            assert.deepEqual(getModuleControllerAction('/'), {
                module: 'home',
                controller: 'index',
                action: 'index'
            });
        });

        it('path /admin/index return home/index/index', () => {
            assert.deepEqual(getModuleControllerAction('/'), {
                module: 'home',
                controller: 'index',
                action: 'index'
            });
        });

        it('path /admin/index/index return home/index/index', () => {
            assert.deepEqual(getModuleControllerAction('/'), {
                module: 'home',
                controller: 'index',
                action: 'index'
            });
        });
    });

    describe('urlObjToParam', () => {
        it('query null, obj {id: 1} return ?id=1', () => {
            assert.equal(urlObjToParam('', {id: 1}), '?id=1');
        });

        it('query null, obj {id: 1, name: 2} return ?id=1&name=2', () => {
            assert.equal(urlObjToParam('', {id: 1, name: 2}), '?id=1&name=2');
        });

        it('query name=2, obj {id: 1} return ?id=1&name=2', () => {
            assert.equal(urlObjToParam('name=2', {id: 1}), '?id=1&name=2');
        });
    });

});
