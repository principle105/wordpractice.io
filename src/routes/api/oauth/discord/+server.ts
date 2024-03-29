import { serializeCookie } from "oslo/cookie";

import { discord } from "$lib/server/auth/clients";
import { generateState } from "$lib/utils/random";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
    const redirectTo = url.searchParams.get("redirectTo");

    const state = generateState(redirectTo);

    const discordAuthURL = await discord.createAuthorizationURL(state, {
        scopes: ["identify", "email"],
    });

    return new Response(null, {
        status: 302,
        headers: {
            Location: discordAuthURL.toString(),
            "Set-Cookie": serializeCookie("discord_oauth_state", state, {
                httpOnly: true,
                secure: process.env.NODE_ENV !== "development",
                maxAge: 60 * 10,
                path: "/",
            }),
        },
    });
};
