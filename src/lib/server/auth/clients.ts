import { Lucia, TimeSpan } from "lucia";
import type { User } from "@prisma/client";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { GitHub, Discord, Google } from "arctic";

import { PrismaClient } from "../prisma";

export const client: PrismaClient = global.__prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
    global.__prisma = client;
}

const adapter = new PrismaAdapter(client.session, client.user);

export const lucia = new Lucia(adapter, {
    sessionCookie: {
        attributes: {
            secure: process.env.NODE_ENV !== "development",
        },
    },
    sessionExpiresIn: new TimeSpan(30, "d"),
    getUserAttributes: (databaseUser: any): User => {
        return databaseUser;
    },
});

const BASE_URL = process.env.BASE_URL as string;

export const github = new GitHub(
    process.env.GH_CLIENT_ID as string,
    process.env.GH_CLIENT_SECRET as string,
    {
        redirectURI: `${BASE_URL}/api/oauth/github/redirect`,
    }
);

export const discord = new Discord(
    process.env.DISCORD_CLIENT_ID as string,
    process.env.DISCORD_CLIENT_SECRET as string,
    `${BASE_URL}/api/oauth/discord/redirect`
);

export const google = new Google(
    process.env.GOOGLE_CLIENT_ID as string,
    process.env.GOOGLE_CLIENT_SECRET as string,
    `${BASE_URL}/api/oauth/google/redirect`
);
