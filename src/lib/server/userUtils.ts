import { DEFAULT_FONT_SCALE } from "$lib/config";
import type { Provider } from "$lib/types";
import { client } from "./auth";

export const generateUsername = async (oAuthName: string) => {
    let username = oAuthName.toLowerCase();

    if (username.length > 12) {
        username = username.slice(0, 12);
    }

    const isUsernameAvailable = await client.user.findUnique({
        where: {
            id: username,
        },
    });

    if (!isUsernameAvailable) {
        return username;
    }

    let uniqueUsername = "";
    let isUnique = false;

    while (!isUnique) {
        const random = Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, "0");
        uniqueUsername = `${username}-${random}`;

        const existingUser = await client.user.findUnique({
            where: {
                id: uniqueUsername,
            },
        });

        if (!existingUser) {
            isUnique = true;
        }
    }

    return uniqueUsername;
};

export const getUser = async (
    provider: Provider,
    email: string,
    name: string,
    avatar: string
) => {
    const existingUser = await client.user.findUnique({
        where: {
            email: email,
            provider,
        },
    });

    if (existingUser) return existingUser;

    const username = await generateUsername(name);

    return await client.user.create({
        data: {
            id: username,
            name: username,
            email: email,
            rating: 1000,
            fontScale: DEFAULT_FONT_SCALE,
            avatar: avatar,
            provider,
        },
    });
};
