import { redirect } from "sveltekit-flash-message/server";

import { discord, lucia } from "$lib/server/auth/clients";
import { getRedirectURLFromState } from "$lib/utils/random";
import { getExistingOrCreateNewUser } from "$lib/server/auth/utils";

import type { RequestHandler } from "./$types";
import { getSignInErrorMessage } from "$lib/server/auth/utils";

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
                    "Something went wrong while signing in. Please try again.",
            },
            event
        );
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
        throw redirect(
            "/signin",
            {
                type: "error",
                message: getSignInErrorMessage(e),
            },
            event
        );
    }
};

interface DiscordUser {
    id: string;
    username: string;
    avatar: string;
    email: string | null;
}
