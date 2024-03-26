import type { PageServerLoad } from "./$types";
import { client } from "$lib/server/auth/clients";
import type { UserProfile } from "$lib/types";

export const load: PageServerLoad = async ({ parent }) => {
    const { user } = await parent();

    const leaderboard: UserProfile[] = await client.user.findMany({
        select: {
            id: true,
            name: true,
            rating: true,
            avatar: true,
        },
        orderBy: {
            rating: "desc",
        },
        take: 100,
    });

    let userPosition: number | null = null;

    if (user) {
        userPosition =
            leaderboard.findIndex((entry) => entry.name === user.name) + 1;

        if (userPosition === -1) {
            const userRank = await client.user.count({
                where: {
                    rating: {
                        gte: user.rating,
                    },
                },
            });
            userPosition = userRank;
        }
    }

    return { userPosition, leaderboard };
};
