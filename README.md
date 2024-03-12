# @lynithdev/fastify-filerouting
File-based routing plugin for fastify. Inspired from [fastify-autoroutes](https://github.com/GiovanniCardamone/fastify-autoroutes).

```
src/
├── server.ts
└── routes/
    ├── index.ts        (ALL)
    ├── post.ts         (POST)
    └── nested/
        └── route.ts    (GET | POST | PUT | DELETE)
```

## 🚀 Install
```sh
npm install --save @lynithdev/fastify-filerouting
```

## 📗 Usage:

> ⚠️ Files ending with `.test.js` or `.test.ts` or starting with `_` or `.` get ignored by the router

### Register Plugin
```ts
import fastify from "fastify";
import fileRouting from "@lynithdev/fastify-filerouting";

const server = fastify({
    ignoreTrailingSlash: true // Recommended
});

server.register(fileRouting, {
    dir: "./routes"   // Required
    prefix: ""        // Optional
});
```

### Create single route
```ts
import { createRoute } from "@lynithdev/fastify-filerouting";

export default createRoute({
    schema: {
        params: Type.Object({
            name: Type.String(),
        }),
    },
    handler: (req, res) => {
        // Type inference if using type providers
        // (with support for type validation as well!)
        res.send(req.params.name); 
    }
});
```

### Create multiple routes in the same file
```ts
import { createRoutes, createRoute } from "@lynithdev/fastify-filerouting";

export default createRoutes({
    get: createRoute({
        schema: {
            params: Type.Object({
                name: Type.String(),
            }),
        },
        handler: (req, res) => {
            // Type inference if using type providers
            // (with support for type validation as well!)
            res.send(req.params.name); 
        }
    }),
    post: createRoute({
        handler: (req, res) => {
            res.send(req.body);
        }
    })
});
```

# 📄 License
This project is licensed under [MIT](./LICENSE)