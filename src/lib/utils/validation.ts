export const findErrorWithUsername = (username: string): string | null => {
    if (username.length < 3 || username.length > 16) {
        return "Username must be between 3 and 16 characters";
    }

    if (!/^\w+$/.test(username)) {
        return "Invalid username. Can only contain letters, numbers, and underscores";
    }

    // TODO: Check if the username has any profanity

    return null;
};
