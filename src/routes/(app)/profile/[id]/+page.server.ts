import { client } from "$lib/server/auth";

import type { PageServerLoad } from "./$types";
import type { UserProfile } from "$lib/types";
import type { User } from "@prisma/client";

export const load: PageServerLoad = async ({ params, parent }) => {
    const { user } = await parent();

    const userId = params.id;

    let profileUser: User | null = null;

    if (user && user.id === userId) {
        profileUser = user;
    } else {
        const fetchedProfileUser = await client.user.findUnique({
            where: {
                id: userId,
            },
        });

        if (!fetchedProfileUser) {
            return {
                userProfile: null,
            };
        }

        profileUser = fetchedProfileUser;
    }

    if (!profileUser) {
        return {
            userProfile: null,
        };
    }

    // Converting the user into a UserProfile to prevent leaking sensitive information
    const userProfile: UserProfile = {
        id: profileUser.id,
        name: profileUser.name,
        rating: profileUser.rating,
        avatar: profileUser.avatar,
    };

    return {
        userProfile,
    };
};
