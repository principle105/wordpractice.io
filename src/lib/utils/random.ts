export const getGuestAvatar = (username: string) => {
    return "https://i.imgur.com/oPyoVMy.jpg";
};

export const getGuestUsername = (seed: number) => {
    // TODO Create a better way to generate guest names
    const random = Math.floor(Math.abs(Math.sin(seed) * 10000));
    const name = random.toString().padStart(4, "0").slice(0, 4);

    return `Guest-${name}`;
};

export const generateState = (redirectURL: string | null = null) => {
    const random = Math.random().toString(36).slice(2, 12);
    const state = `${random}${redirectURL ?? "/"}`;

    return btoa(state);
};

export const getRedirectURLFromState = (state: string) => {
    const decoded = atob(state);

    return decoded.slice(10);
};

export const generateRandomString = (length: number) => {
    return String(
        Math.floor(Math.random() * Math.pow(10, length))
            .toString()
            .padStart(length, "0")
    );
};
