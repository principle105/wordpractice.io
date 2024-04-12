import type { PageServerLoad } from "./$types";
import { client } from "$lib/server/auth/clients";
import type { UserProfile } from "$lib/types";

export const load: PageServerLoad = async ({ parent }) => {
    const { user } = await parent();

    // Fetching the top 100 users ordered by rating
    const leaderboard: UserProfile[] = await client.user.findMany({
        select: {
            id: true,
            username: true,
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
            leaderboard.findIndex((entry) => entry.username === user.username) +
            1;

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

    await new Promise((resolve) => setTimeout(resolve, 2000));

    return { userPosition, leaderboard };
};
