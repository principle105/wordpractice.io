import { redirect } from "sveltekit-flash-message/server";

import { discord, lucia } from "$lib/server/auth/clients";
import { getRedirectURLFromState } from "$lib/utils/random";
import { getExistingOrCreateNewUser } from "$lib/server/auth/utils";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
    const stateCookie = event.cookies.get("discord_oauth_state");

    const code = event.url.searchParams.get("code");
    const state = event.url.searchParams.get("state");

    if (!state || !stateCookie || !code || stateCookie !== state) {
        throw redirect(
            "/signin",
            {
                type: "error",
                message:
                    "Malformed parameters in the request. Please try again.",
            },
            event
        );
    }

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

    if (!discordUserResponse.ok) {
        throw redirect(
            "/signin",
            {
                type: "error",
                message:
                    "There was an error while trying to fetch your Discord account information. Please try again.",
            },
            event
        );
    }

    const discordUser: DiscordUser = await discordUserResponse.json();

    if (!discordUser.email) {
        throw redirect(
            "/signin",
            {
                type: "error",
                message:
                    "You need to have an email address associated with your Discord account to sign in.",
            },
            event
        );
    }

    const user = await getExistingOrCreateNewUser({
        name: discordUser.username,
        email: discordUser.email,
        avatar: `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`,
        provider: "discord",
    });

    if (user === null) {
        throw redirect(
            "/signin",
            {
                type: "error",
                message:
                    "This email address is already used by another account.",
            },
            event
        );
    }

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    return new Response(null, {
        status: 302,
        headers: {
            Location: `/${redirectURL.slice(1)}`, // prevents open redirect attack
            "Set-Cookie": sessionCookie.serialize(),
        },
    });
};

interface DiscordUser {
    id: string;
    username: string;
    avatar: string;
    email: string | null;
}
