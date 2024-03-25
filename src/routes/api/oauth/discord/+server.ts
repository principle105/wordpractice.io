import { serializeCookie } from "oslo/cookie";

import { discord } from "$lib/server/auth";
import { generateState } from "$lib/utils/random";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
    const redirectTo = url.searchParams.get("redirectTo");

    const state = generateState(redirectTo);

    const discordAuthorizationURL = await discord.createAuthorizationURL(
        state,
        {
            scopes: ["identify", "email"],
        }
    );

    return new Response(null, {
        status: 302,
        headers: {
            Location: discordAuthorizationURL.toString(),
            "Set-Cookie": serializeCookie("discord_oauth_state", state, {
                httpOnly: true,
                secure: process.env.NODE_ENV !== "development",
                maxAge: 60 * 10,
                path: "/",
            }),
        },
    });
};
