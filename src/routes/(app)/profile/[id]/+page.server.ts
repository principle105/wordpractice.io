import type { User } from "@prisma/client";
import { client } from "$lib/server/auth/clients";

import type { PageServerLoad } from "./$types";
import type { UserProfile } from "$lib/types";

export const load: PageServerLoad = async ({ params, parent }) => {
    const { user } = await parent();

    const userId = params.id;

    let userProfile: UserProfile | null = null;

    if (user && user.id === userId) {
        userProfile = {
            id: user.id,
            name: user.name,
            rating: user.rating,
            avatar: user.avatar,
        };
    } else {
        const fetchedProfileUser = await client.user.findUnique({
            select: {
                id: true,
                name: true,
                rating: true,
                avatar: true,
            },
            where: {
                id: userId,
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
