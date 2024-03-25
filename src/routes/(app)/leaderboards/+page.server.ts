import type { PageServerLoad } from "./$types";
import { client } from "$lib/server/auth/clients";

export const load: PageServerLoad = async ({ parent }) => {
    const { user } = await parent();

    // prisma get top 100 users by .rating, return leaderboard with usernames and ratings
    const leaderboard = await client.user.findMany({
        select: {
            name: true,
            rating: true,
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

    return { user, userPosition, leaderboard };
};
