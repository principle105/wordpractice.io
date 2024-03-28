import { client } from "$lib/server/auth/clients";

import type { PageServerLoad } from "./$types";
import type { UserProfile } from "$lib/types";

export const load: PageServerLoad = async ({ params, parent }) => {
    const { user } = await parent();

    const username = params.username;

    let userProfile: UserProfile | null = null;

    if (user && user.username === username) {
        userProfile = {
            id: user.id,
            username: user.username,
            rating: user.rating,
            avatar: user.avatar,
        };
    } else {
        const fetchedProfileUser = await client.user.findUnique({
            select: {
                id: true,
                username: true,
                rating: true,
                avatar: true,
            },
            where: {
                username,
            },
        });

        if (!fetchedProfileUser) {
            return {
                userProfile: null,
            };
        }

        userProfile = fetchedProfileUser;
    }

    if (!userProfile) {
        return {
            userProfile: null,
        };
    }

    return {
        userProfile,
    };
};
