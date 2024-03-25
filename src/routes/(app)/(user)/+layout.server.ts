import type { LayoutServerLoad } from "./$types";
import { redirect } from "sveltekit-flash-message/server";

export const load: LayoutServerLoad = async (event) => {
    if (!event.locals.user) {
        const fromUrl = event.url.pathname + event.url.search;

        throw redirect(
            `/signin?redirectTo=${fromUrl}`,
            {
                type: "error",
                message: "You need to be signed in to view this page.",
            },
            event
        );
    }
};
