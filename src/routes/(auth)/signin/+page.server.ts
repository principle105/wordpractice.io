import type { PageServerLoad } from "./$types";
import { redirect } from "sveltekit-flash-message/server";

export const load: PageServerLoad = async (event) => {
    if (event.locals.user !== null) {
        throw redirect(
            "/",
            {
                type: "error",
                message: "You are already signed in.",
            },
            event
        );
    }
};
