import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
    // Fetching the user from the session
    const user = (await locals.auth.validate())?.user;

    return { user };
};
