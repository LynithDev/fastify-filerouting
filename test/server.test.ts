import fastify from 'fastify'
import mockFs from 'mock-fs'
import path from 'path'
import filerouting from "../src";

function mock(dir: string, filesystem: { [key: string]: any }): string {
    mockFs({
        [dir]: {
            ...filesystem,
        },
        'node_modules': mockFs.load(path.resolve(process.cwd(), 'node_modules')),
    }, { 
        createCwd: true 
    })

    return path.join(process.cwd(), dir)
}

function restore() {
    mockFs.restore()
}

const routeHelloWorld = `
const { createRoute } = require("../src");

module.exports = createRoute({
    method: "get",
    handler: (req, res) => {
        res.send("Hello World!");
    }
});
`.trim();

const routePostBody = `
const { createRoute } = require("../src");

module.exports = createRoute({
    method: "post",
    handler: (req, res) => {
        res.send(req.body);
    }
});
`.trim();

const multipleRoutes = `
const { createRoute, createRoutes } = require("../../src");

const test = createRoutes({
    get: createRoute({
        handler: (req, res) => {
            res.send("Hello World!");
        }
    }),
    post: createRoute({
        handler: (req, res) => {
            res.send(req.body)
        }
    })
});

module.exports = test
`.trim();

describe("Routes", () => {
    
    afterEach(() => {
        restore()
    });

    test("Index route", (done) => {
        const server = fastify();
        const dir = mock('routes', {
            'index.js': routeHelloWorld
        })

        server.register(filerouting, {
            dir
        });

        server.inject({
            method: 'GET',
            url: '/',
        }, (err, res) => {
            expect(err).toBe(null)
            expect(res?.payload).toBe("Hello World!");
            done()
        })
    });

    test("Prefixed post route", (done) => {
        const server = fastify();
        const dir = mock('routes', {
            'post.js': routePostBody
        })

        server.register(filerouting, {
            dir,
            prefix: "/api/"
        });

        server.inject({
            method: 'POST',
            url: '/api/post',
            body: {
                hello: "world"
            }
        }, (err, res) => {
            expect(err).toBe(null)
            expect(res?.payload).toBe(JSON.stringify({ hello: "world" }));
            done()
        })
    });

    test("Multiple routes", (done) => {
        const server = fastify({
            ignoreTrailingSlash: true
        });
        const dir = mock('routes', {
            'multipleRoutes': {
                'index.js': multipleRoutes
            }
        });

        server.register(filerouting, {
            dir,
        });

        server.inject({
            method: 'POST',
            url: '/multipleRoutes',
            body: {
                hello: "world"
            }
        }, (err, res) => {
            expect(err).toBe(null)
            expect(res?.payload).toBe(JSON.stringify({ hello: "world" }));
            
            server.inject({
                method: "GET",
                url: "/multipleRoutes/",
            }, (err, res) => {
                expect(err).toBe(null)
                expect(res?.payload).toBe("Hello World!");

                done()
            })
        })
    });

});