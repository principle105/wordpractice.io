import { client, github, lucia } from "$lib/server/auth";
import { OAuth2RequestError } from "arctic";
import type { RequestHandler } from "./$types";
import { DEFAULT_FONT_SCALE } from "$lib/config";

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
        const getUser = async () => {
            const tokens = await github.validateAuthorizationCode(code);
            const githubUserResponse = await fetch(
                "https://api.github.com/user",
                {
                    headers: {
                        Authorization: `Bearer ${tokens.accessToken}`,
                    },
                }
            );
            const githubUser: GitHubUserResult =
                await githubUserResponse.json();

            const existingUser = await client.user.findUnique({
                where: {
                    id: githubUser.id.toString(),
                },
            });

            if (existingUser) return existingUser;

            if (!githubUser.email) {
                const tokens = await github.validateAuthorizationCode(code);
                const response = await fetch(
                    "https://api.github.com/user/emails",
                    {
                        headers: {
                            Authorization: `Bearer ${tokens.accessToken}`,
                        },
                    }
                );
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
                return null;
            }

            return await client.user.create({
                data: {
                    id: githubUser.id.toString(),
                    email: githubUser.email,
                    name: githubUser.name ?? githubUser.login,
                    rating: 1000,
                    fontScale: DEFAULT_FONT_SCALE,
                    avatar: githubUser.avatar_url,
                },
            });
        };

        const user = await getUser();

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
                Location: "/",
                "Set-Cookie": sessionCookie.serialize(),
            },
        });
    } catch (e) {
        console.log(e);
        if (e instanceof OAuth2RequestError) {
            // bad verification code, invalid credentials, etc
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
