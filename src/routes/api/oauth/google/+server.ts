import { google } from "$lib/server/auth";
import { generateState } from "$lib/utils/random";
import { generateCodeVerifier } from "arctic";

import type { RequestHandler } from "./$types";
import { serializeCookie } from "oslo/cookie";

export const GET: RequestHandler = async ({ url }) => {
    const redirectTo = url.searchParams.get("redirectTo");

    const state = generateState(redirectTo);
    const codeVerifier = generateCodeVerifier();

    const googleAuthorizationURL = await google.createAuthorizationURL(
        state,
        codeVerifier,
        {
            scopes: ["profile", "email"],
        }
    );

    return new Response(null, {
        status: 302,
        headers: {
            Location: googleAuthorizationURL.toString(),
            "Set-Cookie": [
                serializeCookie("google_oauth_state", state, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV !== "development",
                    maxAge: 60 * 10,
                    path: "/",
                }),
                serializeCookie("google_oauth_code_verifier", codeVerifier, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV !== "development",
                    maxAge: 60 * 10,
                    path: "/",
                }),
            ].join(","),
        },
    });
};
