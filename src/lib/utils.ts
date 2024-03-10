import type { Replay } from "./types";

export const convertReplayToText = (replay: Replay) => {
    let text = "";
    for (const item of replay) {
        if (item.type === "character") {
            text += item.letter;
        } else if (item.type === "delete") {
            text = text.slice(0, item.slice[0]) + text.slice(item.slice[1]);
        }
    }
    return text.split(" ");
};

export const getCaretData = (replay: Replay) => {
    if (replay.length === 0) return null;

    const latestAction = replay[replay.length - 1];

    if (latestAction.type !== "caret") {
        return null;
    }

    return latestAction;
};

export const getCorrect = (wordsTyped: string[], quote: string[]) => {
    const correctWords: string[] = [];

    let i = 0;

    for (const word of quote) {
        if (i > wordsTyped.length - 1) {
            break;
        }

        if (word === wordsTyped[i] && wordsTyped.length - 1 > i) {
            correctWords.push(word);
            i++;
            continue;
        }

        let correctChars = "";

        let n = 0;

        for (const letter of word) {
            if (wordsTyped[i][n] !== letter) break;

            correctChars += letter;
            n++;
        }

        correctWords.push(correctChars);
        break;
    }

    const correct = correctWords.join(" ");

    const incorrectChars = wordsTyped.join(" ").length - correct.length;

    return { correct, incorrectChars };
};

export const calculateWpm = (
    endTime: number,
    startTime: number,
    correctChars: number
) => {
    const minutesElapsed = (endTime - startTime) / 1000 / 60;

    return Math.round(correctChars / minutesElapsed / 5);
};

export const getGuestName = (seed: number) => {
    // TODO Create a better way to generate guest names
    const random = Math.floor(Math.abs(Math.sin(seed) * 10000));
    const name = random.toString().padStart(4, "0").slice(0, 4);

    return `Guest-${name}`;
};

export const getTotalCorrect = (replay: Replay, quote: string) => {
    let totalCorrectChars = 0;
    let totalIncorrectChars = 0;

    // TODO: do a proper calculation here and rename getcorrect and this function so that it's less confusing

    return { totalCorrectChars, totalIncorrectChars };
};

export const getGuestAvatar = (name: string) => {
    return "https://i.imgur.com/oPyoVMy.jpg";
};

export const convertStringToInteger = (str: string): number | null => {
    const parsedValue = parseInt(str, 10);

    if (isNaN(parsedValue)) {
        return null;
    }

    return parsedValue;
};
