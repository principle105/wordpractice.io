import type { RequestHandler } from "./$types";
import { lucia } from "$lib/server/auth";

export const POST: RequestHandler = async ({ locals }) => {
    const session = await locals.auth.validate();

    if (!session) {
        return new Response(null, { status: 401 });
    }

    // Deleting the session from the server
    await lucia.invalidateSession(session.sessionId);
    await lucia.deleteDeadUserSessions(session.userId);

    // Deleting the session from the client
    locals.auth.setSession(null);

    return new Response(null, { status: 200 });
};
