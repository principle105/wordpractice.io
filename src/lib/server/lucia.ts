import { lucia } from "lucia";
import { sveltekit } from "lucia/middleware";
import { prisma } from "@lucia-auth/adapter-prisma";
import { github, discord } from "@lucia-auth/oauth/providers";
import { PrismaClient } from "./prisma";

const client = global.__prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
    global.__prisma = client;
}

export default prisma;

export const auth = lucia({
    env: process.env.NODE_ENV === "development" ? "DEV" : "PROD",
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
            rating: databaseUser.rating,
            fontScale: databaseUser.fontScale,
        };
    },
});

export const githubAuth = github(auth, {
    clientId: process.env.GITHUB_ID as string,
    clientSecret: process.env.GITHUB_SECRET as string,
    redirectUri: process.env.GITHUB_REDIRECT_URL as string,
});

export const discordAuth = discord(auth, {
    clientId: process.env.DISCORD_ID as string,
    clientSecret: process.env.DISCORD_SECRET as string,
    scope: ["identify", "email"],
    redirectUri: process.env.DISCORD_REDIRECT_URL as string,
});

export type Auth = typeof auth;
