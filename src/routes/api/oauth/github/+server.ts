import { github } from "$lib/server/auth";
import { generateState } from "arctic";

import type { RequestHandler } from "./$types";
import { serializeCookie } from "oslo/cookie";

export const GET: RequestHandler = async () => {
    const state = generateState();

    const url = await github.createAuthorizationURL(state);

    return new Response(null, {
        status: 302,
        headers: {
            Location: url.toString(),
            "Set-Cookie": serializeCookie("github_oauth_state", state, {
                httpOnly: true,
                secure: process.env.NODE_ENV !== "development",
                maxAge: 60 * 10,
                path: "/",
            }),
        },
    });
};
