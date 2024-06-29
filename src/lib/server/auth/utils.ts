import {
    DEFAULT_FONT_SCALE,
    DEFAULT_RATING,
    DEFAULT_SHOW_CURSOR,
    DEFAULT_STATE_UPDATE_INTERVAL,
    MAX_USERNAME_LENGTH,
} from "$lib/config";
import type { Provider } from "$lib/types";
import { generateRandomString } from "$lib/utils/random";

import { client } from "./clients";

const MAX_ATTEMPTS_TO_GENERATE_USERNAME = 15;
const RANDOM_NUMBER_LENGTH = 4;

export const generateDefaultUsername = async (oAuthName: string) => {
    // Setting the username to lowercase and removing all characters that are not letters, numbers and/or underscores
    let username = oAuthName.toLowerCase().replace(/[^a-z0-9_]/g, "");

    if (username.length > MAX_USERNAME_LENGTH) {
        username = username.slice(0, MAX_USERNAME_LENGTH);
    }

    const isUsernameTaken = await client.user.findUnique({
        where: {
            username,
        },
    });

    if (!isUsernameTaken) {
        return username;
    }

    // Slicing the username to allow for the random number to be appended
    username = username.slice(
        0,
        MAX_USERNAME_LENGTH - RANDOM_NUMBER_LENGTH - 1
    );

    let uniqueUsername: string | null = null;
    let usernameGenerationAttempts = 0;

    while (uniqueUsername === null) {
        const random = generateRandomString(RANDOM_NUMBER_LENGTH);

        uniqueUsername = `${username}-${random}`;

        const existingUser = await client.user.findUnique({
            where: {
                username: uniqueUsername,
            },
        });

        if (!existingUser) continue;

        usernameGenerationAttempts++;

        // Generating a completely random username if the username generation attempts exceeds the limit
        if (usernameGenerationAttempts >= MAX_ATTEMPTS_TO_GENERATE_USERNAME) {
            uniqueUsername = generateRandomString(MAX_USERNAME_LENGTH);
        }
    }

    return uniqueUsername;
};

export const checkUsernameAvailability = async (username: string) => {
    const existingUser = await client.user.findUnique({
        where: {
            username,
        },
    });

    return !existingUser;
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
        const username = await generateDefaultUsername(userAttributes.name);

        return await client.user.create({
            data: {
                username,
                email: userAttributes.email,
                provider: userAttributes.provider,
                rating: DEFAULT_RATING,
                fontScale: DEFAULT_FONT_SCALE,
                avatar: userAttributes.avatar,
                pickedInitalUsername: false,
                showOpponentCursor: DEFAULT_SHOW_CURSOR,
                statUpdateInterval: DEFAULT_STATE_UPDATE_INTERVAL,
            },
        });
    }

    if (existingUser.provider !== userAttributes.provider) {
        return null;
    }

    return existingUser;
};
