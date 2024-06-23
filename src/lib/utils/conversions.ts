import { textCategories } from "../constants";
import type { TextCategory } from "../types";

export const convertStringToInteger = (str: string): number | null => {
    const parsedValue = parseInt(str, 10);

    if (isNaN(parsedValue)) {
        return null;
    }

    return parsedValue;
};

export const textCategoryToName = (
    textCategory: TextCategory
): string | null => {
    for (const [name, category] of Object.entries(textCategories)) {
        if (category === textCategory) return name;
    }

    return null;
};

export const secondsToMinutesAndSeconds = (seconds: number): string => {
    const minDisplay = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secDisplay = String(seconds % 60).padStart(2, "0");

    return `${minDisplay}:${secDisplay}`;
};
