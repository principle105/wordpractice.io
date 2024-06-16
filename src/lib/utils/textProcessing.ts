import type { Replay } from "../types";

export const convertReplayToWords = (
    replay: Replay,
    quote: string[]
): string[] => {
    const correctWords: string[] = [];

    let quoteWordIndex = 0;
    let currentWord = "";

    let cursorIndex = 0;

    for (const action of replay) {
        if (action.type === "caret") {
            if (action.start === action.end) {
                cursorIndex = action.start;
            }
            continue;
        }

        if (action.type === "delete") {
            currentWord =
                currentWord.slice(0, action.slice[0]) +
                currentWord.slice(action.slice[1]);
            continue;
        }

        const word = quote[quoteWordIndex];

        if (action.letter === " " && currentWord === word) {
            quoteWordIndex++;
            correctWords.push(currentWord);
            currentWord = "";
            cursorIndex = 0;
            continue;
        }

        // Insert the letter at the cursor index
        currentWord =
            currentWord.slice(0, cursorIndex) +
            action.letter +
            currentWord.slice(cursorIndex);

        cursorIndex += 1;
    }

    correctWords.push(currentWord);

    return correctWords;
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
