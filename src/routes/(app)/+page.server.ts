import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies }) => {
    const sessionId = cookies.get("authSession");

    return {
        sessionId,
    };
};
