export const convertStringToInteger = (str: string): number | null => {
    const parsedValue = parseInt(str, 10);

    if (isNaN(parsedValue)) {
        return null;
    }

    return parsedValue;
};
