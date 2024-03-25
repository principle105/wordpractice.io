import { github } from "$lib/server/auth";
import { generateState } from "$lib/utils/random";

import type { RequestHandler } from "./$types";
import { serializeCookie } from "oslo/cookie";

export const GET: RequestHandler = async ({ url }) => {
    const redirectTo = url.searchParams.get("redirectTo");

    const state = generateState(redirectTo);

    const githubAuthorizationURL = await github.createAuthorizationURL(state);

    return new Response(null, {
        status: 302,
        headers: {
            Location: githubAuthorizationURL.toString(),
            "Set-Cookie": serializeCookie("github_oauth_state", state, {
                httpOnly: true,
                secure: process.env.NODE_ENV !== "development",
                maxAge: 60 * 10,
                path: "/",
            }),
        },
    });
};
