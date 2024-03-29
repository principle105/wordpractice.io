import { generateCodeVerifier } from "arctic";
import { serializeCookie } from "oslo/cookie";

import { google } from "$lib/server/auth/clients";
import { generateState } from "$lib/utils/random";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
    const redirectTo = url.searchParams.get("redirectTo");

    const state = generateState(redirectTo);
    const codeVerifier = generateCodeVerifier();

    const googleAuthURL = await google.createAuthorizationURL(
        state,
        codeVerifier,
        {
            scopes: ["profile", "email"],
        }
    );

    return new Response(null, {
        status: 302,
        headers: {
            Location: googleAuthURL.toString(),
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
