import { Lucia, TimeSpan } from "lucia";
import type { User } from "@prisma/client";
import { PrismaClient } from "./prisma";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { GitHub, Discord } from "arctic";

export const client = new PrismaClient();

const adapter = new PrismaAdapter(client.session, client.user);

export const lucia = new Lucia(adapter, {
    sessionCookie: {
        attributes: {
            secure: process.env.NODE_ENV !== "development",
        },
    },
    sessionExpiresIn: new TimeSpan(30, "d"),
    // TODO: fix typing for getUserAttributes
    getUserAttributes: (databaseUser: any): User => {
        return {
            id: databaseUser.id,
            name: databaseUser.name,
            email: databaseUser.email,
            rating: databaseUser.rating,
            fontScale: databaseUser.fontScale,
            avatar: databaseUser.avatar,
        };
    },
});

export const github = new GitHub(
    process.env.GITHUB_CLIENT_ID as string,
    process.env.GITHUB_CLIENT_SECRET as string,
    {
        redirectURI: process.env.GITHUB_REDIRECT_URL as string,
    }
);

export const discord = new Discord(
    process.env.DISCORD_CLIENT_ID as string,
    process.env.DISCORD_CLIENT_SECRET as string,
    process.env.DISCORD_REDIRECT_URL as string
);
