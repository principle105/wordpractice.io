import { OAuth2RequestError } from "arctic";

import { discord, lucia } from "$lib/server/auth/clients";
import { getRedirectURLFromState } from "$lib/utils/random";
import { getExistingOrCreateNewUser } from "$lib/server/auth/utils";

import type { RequestHandler } from "./$types";

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
        const redirectURL = getRedirectURLFromState(state);

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
                status: 500,
            });
        }

        const user = await getExistingOrCreateNewUser("discord", {
            name: discordUser.username,
            email: discordUser.email,
            avatar: `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`,
        });

        const session = await lucia.createSession(user.id, {});
        const sessionCookie = lucia.createSessionCookie(session.id);

        return new Response(null, {
            status: 302,
            headers: {
                Location: `/${redirectURL.slice(1)}`, // prevents open redirect attack
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
