import type { RequestHandler } from "./$types";
import { lucia } from "$lib/server/auth/clients";

export const POST: RequestHandler = async ({ cookies, locals }) => {
    if (!locals.session) {
        return new Response(null, { status: 401 });
    }

    await lucia.invalidateSession(locals.session.id);

    const sessionCookie = lucia.createBlankSessionCookie();
    cookies.set(sessionCookie.name, sessionCookie.value, {
        path: ".",
        ...sessionCookie.attributes,
    });

    return new Response(null, { status: 200 });
};
