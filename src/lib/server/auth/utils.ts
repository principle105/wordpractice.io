import { DEFAULT_FONT_SCALE, DEFAULT_RATING } from "$lib/config";
import type { Provider } from "$lib/types";
import { Prisma } from "@prisma/client";

import { client } from "./clients";

export const generateUsername = async (oAuthName: string) => {
    // Setting username to lowercase and removing spaces
    let username = oAuthName.toLowerCase().replace(/\s/g, "");

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
}

export const getExistingOrCreateNewUser = async (
    provider: Provider,
    userAttributes: UserAttributes
) => {
    const existingUser = await client.user.findUnique({
        where: {
            email: userAttributes.email,
            provider,
        },
    });

    if (existingUser) return existingUser;

    const username = await generateUsername(userAttributes.name);

    return await client.user.create({
        data: {
            username,
            email: userAttributes.email,
            rating: DEFAULT_RATING,
            fontScale: DEFAULT_FONT_SCALE,
            avatar: userAttributes.avatar,
            pickedInitalUsername: false,
            provider,
        },
    });
};

export const getSignInErrorMessage = (e: unknown): string => {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
            return "That email address is already used by another account.";
        }
    }

    return "Something went wrong while signing in. Please try again.";
};
