import { discord, lucia } from "$lib/server/auth/clients";
import { OAuth2RequestError } from "arctic";
import type { RequestHandler } from "./$types";
import { getRedirectUrlFromState } from "$lib/utils/random";
import { getUser } from "$lib/server/auth/utils";

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
        const redirectUrl = getRedirectUrlFromState(state);

        const tokens = await discord.validateAuthorizationCode(code);
        const discordUserResponse = await fetch(
            "https://discord.com/api/users/@me",
            {
                headers: {
                    Authorization: `Bearer ${tokens.accessToken}`,
                },
            }
        );
        const discordUser: DiscordUser = await discordUserResponse.json();

        if (!discordUser.email) {
            return new Response(null, {
                status: 400,
            });
        }

        const user = await getUser(
            "discord",
            discordUser.email,
            discordUser.username,
            `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        );

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
                Location: `/${redirectUrl.slice(1)}`, // prevents open redirect attack
                "Set-Cookie": sessionCookie.serialize(),
            },
        });
    } catch (e) {
        console.log(e);
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
