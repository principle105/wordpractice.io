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

export const getCompletedAndIncorrectWords = (
    wordsTyped: string[],
    quote: string[]
) => {
    const completedWords: string[] = [];

    let i = 0;

    for (const word of quote) {
        if (i > wordsTyped.length - 1) {
            break;
        }

        if (word === wordsTyped[i] && wordsTyped.length - 1 > i) {
            completedWords.push(word);
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

        completedWords.push(correctChars);
        break;
    }

    const completeWordsCount = completedWords.join(" ");

    const incorrectChars =
        wordsTyped.join(" ").length - completeWordsCount.length;

    return { completedWords: completeWordsCount, incorrectChars };
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
