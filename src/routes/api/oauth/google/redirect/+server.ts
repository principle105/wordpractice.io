import { redirect } from "sveltekit-flash-message/server";

import { google, lucia } from "$lib/server/auth/clients";
import { getRedirectURLFromState } from "$lib/utils/random";
import { getExistingOrCreateNewUser } from "$lib/server/auth/utils";

import type { RequestHandler } from "./$types";
import { getSignInErrorMessage } from "$lib/server/auth/utils";

export const GET: RequestHandler = async (event) => {
    const stateCookie = event.cookies.get("google_oauth_state");
    const codeVerifierCookie = event.cookies.get("google_oauth_code_verifier");

    const code = event.url.searchParams.get("code");
    const state = event.url.searchParams.get("state");

    if (
        !state ||
        !stateCookie ||
        !code ||
        !codeVerifierCookie ||
        stateCookie !== state
    ) {
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

        const tokens = await google.validateAuthorizationCode(
            code,
            codeVerifierCookie
        );

        const googleUserResponse = await fetch(
            "https://openidconnect.googleapis.com/v1/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${tokens.accessToken}`,
                },
            }
        );

        const googleUser: GoogleUser = await googleUserResponse.json();

        const user = await getExistingOrCreateNewUser("google", {
            name: googleUser.name,
            email: googleUser.email,
            avatar: googleUser.picture,
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

interface GoogleUser {
    sub: string;
    name: string;
    given_name: string;
    picture: string;
    email: string;
    email_verified: boolean;
    locale: string;
}
