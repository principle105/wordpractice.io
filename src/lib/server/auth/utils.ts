import { DEFAULT_FONT_SCALE, DEFAULT_RATING } from "$lib/config";
import type { Provider } from "$lib/types";

import { client } from "./clients";

export const generateUsername = async (oAuthName: string) => {
    // Setting the username to lowercase and removing all characters that are not letters, numbers and/or underscores
    let username = oAuthName.toLowerCase().replace(/[^a-z0-9_]/g, "");

    if (username.length > 12) {
        username = username.slice(0, 12);
    }

    const isUsernameAvailable = await client.user.findUnique({
        where: {
            username,
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
                username: uniqueUsername,
            },
        });

        if (!existingUser) {
            isUnique = true;
        }
    }

    return uniqueUsername;
};

interface UserAttributes {
    email: string;
    name: string;
    avatar: string;
    provider: Provider;
}

export const getExistingOrCreateNewUser = async (
    userAttributes: UserAttributes
) => {
    const existingUser = await client.user.findUnique({
        where: {
            email: userAttributes.email,
        },
    });

    if (!existingUser) {
        const username = await generateUsername(userAttributes.name);

        return await client.user.create({
            data: {
                username,
                email: userAttributes.email,
                provider: userAttributes.provider,
                rating: DEFAULT_RATING,
                fontScale: DEFAULT_FONT_SCALE,
                avatar: userAttributes.avatar,
                pickedInitalUsername: false,
            },
        });
    }

    if (existingUser.provider !== userAttributes.provider) {
        return null;
    }

    return existingUser;
};
