import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { client } from "$lib/server/auth/clients";
import { findErrorWithUsername } from "$lib/utils/validation";

export const POST: RequestHandler = async ({ locals, url }) => {
    if (locals.user === null) {
        throw error(401, "Unauthorized");
    }

    const newUsername = url.searchParams.get("newUsername");

    if (!newUsername) {
        throw error(400, "No new username provided");
    }

    if (locals.user.pickedInitalUsername) {
        throw error(400, "Username already picked");
    }

    const errorWithUsername = findErrorWithUsername(newUsername);

    if (errorWithUsername) {
        throw error(400, errorWithUsername);
    }

    if (newUsername !== locals.user.username) {
        // Check if username is already taken
        const user = await client.user.findUnique({
            where: { username: newUsername },
        });

        if (user) {
            throw error(400, "Username already taken");
        }
    }

    await client.user.update({
        where: { id: locals.user.id },
        data: {
            username: newUsername,
            pickedInitalUsername: true,
        },
    });

    return new Response("Username changed", { status: 200 });
};
