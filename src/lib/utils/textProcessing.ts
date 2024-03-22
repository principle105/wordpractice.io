import type { Replay } from "../types";

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

export const getCaretData = (replay: Replay) => {
    if (replay.length === 0) return null;

    const latestAction = replay[replay.length - 1];

    if (latestAction.type !== "caret") {
        return null;
    }

    return latestAction;
};
