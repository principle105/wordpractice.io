import { lucia } from "lucia";
import { sveltekit } from "lucia/middleware";
import { dev } from "$app/environment";
import { prisma } from "@lucia-auth/adapter-prisma";
import { github } from "@lucia-auth/oauth/providers";
import {
    GITHUB_ID,
    GITHUB_SECRET,
    GITHUB_REDIRECT_URL,
} from "$env/static/private";
import { PrismaClient } from "./prisma";
import { env } from "$env/dynamic/private";

const client = global.__prisma || new PrismaClient();

if (env.NODE_ENV === "development") {
    global.__prisma = client;
}

export default prisma;

export const auth = lucia({
    env: dev ? "DEV" : "PROD",
    middleware: sveltekit(),
    adapter: prisma(client, {
        user: "user", // model User {}
        key: "key", // model Key {}
        session: "session", // model Session {}
    }),
    getUserAttributes(databaseUser) {
        return {
            id: databaseUser.id,
            name: databaseUser.name,
            email: databaseUser.email,
        };
    },
});

export const githubAuth = github(auth, {
    clientId: GITHUB_ID,
    clientSecret: GITHUB_SECRET,
    scope: ["user:email"],
    redirectUri: GITHUB_REDIRECT_URL,
});

export type Auth = typeof auth;
