import { google, lucia } from "$lib/server/auth/clients";
import { OAuth2RequestError } from "arctic";
import type { RequestHandler } from "./$types";
import { getRedirectUrlFromState } from "$lib/utils/random";
import { getUser } from "$lib/server/auth/utils";

export const GET: RequestHandler = async ({ cookies, url }) => {
    const stateCookie = cookies.get("google_oauth_state");
    const codeVerifierCookie = cookies.get("google_oauth_code_verifier");

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (
        !state ||
        !stateCookie ||
        !code ||
        !codeVerifierCookie ||
        stateCookie !== state
    ) {
        return new Response(null, {
            status: 400,
        });
    }

    try {
        const redirectUrl = getRedirectUrlFromState(state);

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

        const user = await getUser(
            "google",
            googleUser.email,
            googleUser.name,
            googleUser.picture
        );

        if (!user) {
            return new Response(null, {
                status: 400,
            });
        }

        const session = await lucia.createSession(user.id, {});
        const sessionCookie = lucia.createSessionCookie(session.id);
        return new Response(null, {
            status: 302,
            headers: {
                Location: `/${redirectUrl.slice(1)}`, // prevents open redirect attack
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

interface GoogleUser {
    sub: string;
    name: string;
    given_name: string;
    picture: string;
    email: string;
    email_verified: boolean;
    locale: string;
}
