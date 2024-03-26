import { redirect } from "sveltekit-flash-message/server";

import { github, lucia } from "$lib/server/auth/clients";
import { getRedirectURLFromState } from "$lib/utils/random";
import { getExistingOrCreateNewUser } from "$lib/server/auth/utils";

import type { RequestHandler } from "./$types";
import { getSignInErrorMessage } from "$lib/server/auth/utils";

export const GET: RequestHandler = async (event) => {
    const stateCookie = event.cookies.get("github_oauth_state");

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

        const tokens = await github.validateAuthorizationCode(code);
        const githubUserResponse = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${tokens.accessToken}`,
            },
        });
        const githubUser: GitHubUserResult = await githubUserResponse.json();

        // Fetching the email separately if the user has their email privated
        if (!githubUser.email) {
            const tokens = await github.validateAuthorizationCode(code);
            const response = await fetch("https://api.github.com/user/emails", {
                headers: {
                    Authorization: `Bearer ${tokens.accessToken}`,
                },
            });
            const emails: EmailResult[] = await response.json();

            const primaryEmail = emails.find(
                (email) => email.primary && email.verified
            )?.email;

            if (primaryEmail) {
                githubUser.email = primaryEmail;
            } else {
                const verifiedEmail = emails.find(
                    (email) => email.verified
                )?.email;

                if (verifiedEmail) {
                    githubUser.email = verifiedEmail;
                }
            }
        }

        if (!githubUser.email) {
            throw redirect(
                "/signin",
                {
                    type: "error",
                    message:
                        "You need to have an email address associated with your GitHub account to sign in.",
                },
                event
            );
        }

        const user = await getExistingOrCreateNewUser("github", {
            name: githubUser.login,
            email: githubUser.email,
            avatar: githubUser.avatar_url,
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

interface GitHubUserResult {
    id: number;
    login: string;
    name: string | null;
    avatar_url: string;
    email: string | null;
}

interface EmailResult {
    email: string;
    verified: boolean;
    primary: boolean;
}
