import { github, lucia } from "$lib/server/auth";
import { OAuth2RequestError } from "arctic";
import type { RequestHandler } from "./$types";
import { getRedirectUrlFromState } from "$lib/utils/random";
import { getUser } from "$lib/server/userUtils";

export const GET: RequestHandler = async ({ cookies, url }) => {
    const stateCookie = cookies.get("github_oauth_state");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!state || !stateCookie || !code || stateCookie !== state) {
        return new Response(null, {
            status: 400,
        });
    }

    try {
        const redirectUrl = getRedirectUrlFromState(state);

        const tokens = await github.validateAuthorizationCode(code);
        const githubUserResponse = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${tokens.accessToken}`,
            },
        });
        const githubUser: GitHubUserResult = await githubUserResponse.json();

        if (!githubUser.email) {
            const tokens = await github.validateAuthorizationCode(code);
            const response = await fetch("https://api.github.com/user/emails", {
                headers: {
                    Authorization: `Bearer ${tokens.accessToken}`,
                },
            });
            const emails: {
                email: string;
                verified: boolean;
                primary: boolean;
            }[] = await response.json();

            githubUser.email =
                emails.find((email) => email.primary && email.verified)
                    ?.email ??
                emails.find((email) => email.verified)?.email ??
                null;
        }

        if (!githubUser.email) {
            return new Response(null, {
                status: 400,
            });
        }

        const user = await getUser(
            "github",
            githubUser.email,
            githubUser.login,
            githubUser.avatar_url
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

interface GitHubUserResult {
    id: number;
    login: string;
    name: string | null;
    avatar_url: string;
    email: string | null;
}
