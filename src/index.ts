import type {
    FastifyReply,
    FastifyRequest,
    RawRequestDefaultExpression,
    RawServerDefault,
    RawReplyDefaultExpression,
    ContextConfigDefault,
    RouteShorthandOptions,
    FastifyInstance,
    RouteGenericInterface, 
    RouteOptions,
    FastifySchema,
    FastifyTypeProviderDefault,
    FastifyTypeProvider
} from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import path from 'path';
import fs from "fs/promises";
import createError from '@fastify/error';
import glob from 'glob-promise';

export type TypedRequest<TSchema extends FastifySchema, TProvider extends FastifyTypeProvider = FastifyTypeProviderDefault> = FastifyRequest<
    RouteGenericInterface,
    RawServerDefault,
    RawRequestDefaultExpression<RawServerDefault>,
    TSchema,
    TProvider
>;

export type TypedResponse<TSchema extends FastifySchema, TProvider extends FastifyTypeProvider = FastifyTypeProviderDefault> = FastifyReply<
    RawServerDefault,
    RawRequestDefaultExpression,
    RawReplyDefaultExpression,
    RouteGenericInterface,
    ContextConfigDefault,
    TSchema,
    TProvider
>;

export type Method = "all" | "get" | "head" | "post" | "put" | "delete" | "connect" | "options" | "trace" | "patch";

export type Route<T extends FastifySchema = never, TProvider extends FastifyTypeProvider = FastifyTypeProviderDefault> = {
    schema?: T,
    method?: Method,
    url?: string,
    handler?: (req: TypedRequest<T, TProvider>, res: TypedResponse<T, TProvider>) => void
} & Omit<RouteOptions, "url" | "handler" | "method">;

export type Routes = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [K in Method]?: Route<any, any>
};

export const createRoute = <
    TSchema extends FastifySchema, 
    TProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
>(opts: Route<TSchema, TProvider>): Route<TSchema, TProvider> => opts;

export const createRoutes = (routes: Routes): Route[] => {
    return Object.entries(routes).map(([method, route]) => {
        if (typeof route.method === "undefined") {
            route.method = method as Method;
        }

        return route;
    })
};

type AutoRouteSettings = {
    dir: string,
    prefix?: string
};

export default fastifyPlugin<AutoRouteSettings>(async (fastify, options) => {
    const dir = asAbsolute(options.dir);
    let prefix = options.prefix || "";
    prefix = prefix.endsWith("/") ? prefix.substring(0, prefix.length - 1) : prefix;

    try {
        const stat = await fs.stat(dir);
        if (!stat.isDirectory()) { throw "Not a directory"; }
    } catch (err) {
        throw createError("1", `'${dir}' is meant to be a directory!`)();
    }

    const routes = await glob(`${dir}/**/[!._]!(*.test).{ts,js}`);
    
    for (const route of routes) {
        const routeName = route
            .replace(dir, "")
            .replace(/(\.js)|(\.ts)|(index)/g, "");

        const imported = await load(route, routeName);
        
        if (!Array.isArray(imported) && imported.hasOwnProperty("handler")) {
            registerRoute(fastify, imported as Route, prefix + routeName);
        } else {
            const modules = imported as Route[];
            modules.forEach((route) => {
                registerRoute(fastify, route, prefix + routeName);
            });
        }
    }
});

function registerRoute(fastify: FastifyInstance, route: Route, routeName: string) {
    const module = route as Route;
    const method = module.method;
    const url = module.url || routeName;
    
    if (typeof method === "string") {
        (fastify as any)[method](url, getRouteOptions(module) as any, module.handler as any);
        return;
    }
        
    throw createError("4", `Route '${routeName}' has a route without an explicit method!`)();
}

function getRouteOptions(route: Route): RouteShorthandOptions {
    const { url, method, handler, ...rest } = route;
    return rest;
}

async function load(file: string, name: string): Promise<Route[] | Route> {
    let imported: Route[] | Route;
    try {
        imported = (await import(file)).default;

    } catch (err) {
        throw createError("2", `Route '${name}' could not be loaded: ${err}`)();
    }

    if (!(typeof imported === "object" || Array.isArray(imported))) {
        throw createError("3", `Route '${name}' default export is not an object!"`)();
    }
    
    return imported;
}

function asAbsolute(dir: string): string {
    if (path.isAbsolute(dir)) {
        return dir;
    } 
    
    if (path.isAbsolute(process.argv[1])) {
        return path.join(process.argv[1], dir);
    }

    return path.join(process.cwd(), process.argv[1], dir);
}