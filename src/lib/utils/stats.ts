import type { Replay } from "../types";
import {
    convertReplayToText,
    getCompletedAndIncorrectWords,
} from "./textProcessing";

export const getTotalCorrectAndIncorrectChars = (
    replay: Replay,
    quote: string
) => {
    const totalTypedChars = replay.filter(
        (action) => action.type === "character"
    ).length;

    const wordsTyped = convertReplayToText(replay);

    const { completedWords } = getCompletedAndIncorrectWords(
        wordsTyped,
        quote.split(" ")
    );

    const totalCorrectChars = completedWords.length;
    const totalIncorrectChars = totalTypedChars - totalCorrectChars;

    return { totalCorrectChars, totalIncorrectChars };
};

export const calculateAccuracy = (
    totalCorrectChars: number,
    totalIncorrectChars: number
) => {
    const totalChars = totalCorrectChars + totalIncorrectChars;

    if (totalChars === 0) {
        return 0;
    }

    return Math.round((totalCorrectChars / totalChars) * 100);
};

export const calculateWpm = (
    endTime: number,
    startTime: number,
    correctChars: number
) => {
    const minutesElapsed = (endTime - startTime) / 1000 / 60;

    return Math.round(correctChars / minutesElapsed / 5);
};
