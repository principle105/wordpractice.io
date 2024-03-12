import { client, discord, lucia } from "$lib/server/auth";
import { OAuth2RequestError } from "arctic";
import type { RequestHandler } from "./$types";
import { DEFAULT_FONT_SCALE } from "$lib/config";

export const GET: RequestHandler = async ({ cookies, url }) => {
    const stateCookie = cookies.get("discord_oauth_state");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!state || !stateCookie || !code || stateCookie !== state) {
        return new Response(null, {
            status: 400,
        });
    }

    try {
        const tokens = await discord.validateAuthorizationCode(code);
        const response = await fetch("https://discord.com/api/users/@me", {
            headers: {
                Authorization: `Bearer ${tokens.accessToken}`,
            },
        });
        const discordUser: DiscordUser = await response.json();

        const getUser = async () => {
            const existingUser = await client.user.findUnique({
                where: {
                    id: discordUser.id.toString(),
                },
            });

            if (existingUser) return existingUser;

            return await client.user.create({
                data: {
                    id: discordUser.id.toString(),
                    name: discordUser.username,
                    email: discordUser.email as string,
                    rating: 1000,
                    fontScale: DEFAULT_FONT_SCALE,
                    avatar: `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`,
                },
            });
        };

        const user = await getUser();

        if (!user) {
            return new Response(null, {
                status: 400,
            });
        }

        const session = await lucia.createSession(user.id, {});
        const sessionCookie = lucia.createSessionCookie(session.id);
        return new Response(null, {
            status: 302,
            headers: {
                Location: "/",
                "Set-Cookie": sessionCookie.serialize(),
            },
        });
    } catch (e) {
        if (e instanceof OAuth2RequestError) {
            return new Response(null, {
                status: 400,
            });
        }
        return new Response(null, {
            status: 500,
        });
    }
};

interface DiscordUser {
    id: string;
    username: string;
    avatar: string;
    email: string | null;
}
