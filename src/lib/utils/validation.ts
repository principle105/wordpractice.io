export const findErrorWithUsername = (username: string): string | null => {
    if (username.length < 6 || username.length > 20) {
        return "Username must be between 6 and 20 characters";
    }

    if (!/^\w+$/.test(username)) {
        return "Invalid username. Must be letters, numbers, and underscores";
    }

    // TODO: Check if the username has any profanity

    return null;
};
