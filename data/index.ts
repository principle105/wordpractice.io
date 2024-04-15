import type { TextCategory, Text } from "../src/lib/types";

const DICTIONARY_LENGTH = 30;

const quoteDirectories = {
    "quote easy": import("./quotes/easy-quotes.json"),
    "quote hard": import("./quotes/hard-quotes.json"),
};

type QuoteCategory = keyof typeof quoteDirectories;

const dictionaryDirectories = {
    "dictionary easy": [
        import("./dictionary/easy/english-200.json"),
        import("./dictionary/easy/english-1k.json"),
    ],
    "dictionary hard": [import("./dictionary/hard/english-10k.json")],
};

type DictionaryCategory = keyof typeof dictionaryDirectories;

export const getQuoteFromCategory = async (
    textCategory: TextCategory
): Promise<Text | null> => {
    if (textCategory in quoteDirectories) {
        const allQuotes = (
            await quoteDirectories[textCategory as QuoteCategory]
        ).default;

        const categoryInfo = allQuotes.quotes;

        const textInfo =
            categoryInfo[Math.floor(Math.random() * categoryInfo.length)];

        return {
            category: allQuotes.name,
            text: textInfo.text,
            source: textInfo.source,
        };
    }

    if (textCategory in dictionaryDirectories) {
        const directories =
            dictionaryDirectories[textCategory as DictionaryCategory];

        const categoryInfo = (
            await directories[Math.floor(Math.random() * directories.length)]
        ).default;

        const text = [];

        while (text.length < DICTIONARY_LENGTH) {
            const word =
                categoryInfo.words[
                    Math.floor(Math.random() * categoryInfo.words.length)
                ];

            text.push(word);
        }

        return {
            category: categoryInfo.name,
            text: text.join(" "),
            source: "unknown",
        };
    }

    return null;
};
