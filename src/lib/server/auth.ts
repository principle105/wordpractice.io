import { Lucia, TimeSpan } from "lucia";
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
    getUserAttributes: (databaseUser) => {
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
        redirectURI: process.env.GITHUB_REDIRECT_URI as string,
    }
);

export const discord = new Discord(
    process.env.DISCORD_CLIENT_ID as string,
    process.env.DISCORD_CLIENT_SECRET as string,
    process.env.DISCORD_REDIRECT_URI as string
);
