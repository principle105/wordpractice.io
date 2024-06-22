import type { Replay } from "../types";
import {
    convertReplayToWords,
    getCompletedAndIncorrectWords,
} from "./textProcessing";

export const getTotalCorrectAndIncorrectChars = (
    replay: Replay,
    text: string[]
) => {
    const wordsTyped = convertReplayToWords(replay, text);
    const { completedWords } = getCompletedAndIncorrectWords(wordsTyped, text);

    const totalCorrectChars = completedWords.length;

    let totalIncorrectChars = 0;
    let prevIncorrectChars = 0;

    replay.forEach((action, i) => {
        if (action.type === "character") {
            const wordsTyped = convertReplayToWords(
                replay.slice(0, i + 1),
                text
            );

            const { incorrectChars } = getCompletedAndIncorrectWords(
                wordsTyped,
                text
            );

            const newIncorrectChars = incorrectChars - prevIncorrectChars;

            if (newIncorrectChars > 0) {
                totalIncorrectChars += newIncorrectChars;
            }

            prevIncorrectChars = incorrectChars;
        }
    });

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

    return Math.round((totalCorrectChars / totalChars) * 100 * 10) / 10;
};

export const calculateWpm = (
    endTime: number,
    startTime: number,
    correctChars: number
) => {
    const minutesElapsed = (endTime - startTime) / 1000 / 60;

    const wpm = Math.round(correctChars / minutesElapsed / 5);

    if (isNaN(wpm)) {
        return 0;
    }

    return wpm;
};
