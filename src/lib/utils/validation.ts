import BadWordsNext from "bad-words-next";
import en from "bad-words-next/data/en.json";

import { MAX_USERNAME_LENGTH, MIN_USERNAME_LENGTH } from "../config";

const badwords = new BadWordsNext({ data: en });

export const findErrorWithUsername = (username: string): string | null => {
    if (
        username.length > MAX_USERNAME_LENGTH ||
        username.length < MIN_USERNAME_LENGTH
    ) {
        return `Username must be between ${MIN_USERNAME_LENGTH} and ${MAX_USERNAME_LENGTH} characters`;
    }

    if (!/^\w+$/.test(username)) {
        return "Invalid username. Can only contain letters, numbers, and underscores";
    }

    // Check if the username has any profanity
    if (badwords.check(username)) {
        return "Username contains profanity";
    }

    return null;
};
