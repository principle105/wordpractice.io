import type {
    TextCategory,
    QuoteCategory,
    DictionaryCategory,
    Quote,
} from "../src/lib/types";

const DICTIONARY_LENGTH = 30;

const quoteDirectories = {
    "quote easy": import("./quotes/easy-quotes.json"),
    "quote hard": import("./quotes/hard-quotes.json"),
};

const dictionaryDirectories = {
    "dictionary easy": [
        import("./dictionary/easy/english-200.json"),
        import("./dictionary/easy/english-1k.json"),
    ],
    "dictionary hard": [import("./dictionary/hard/english-10k.json")],
};

export const getRandomQuoteFromCategory = async (
    textCategory: TextCategory
): Promise<Quote | null> => {
    if (textCategory in quoteDirectories) {
        const allQuotes = (
            await quoteDirectories[textCategory as QuoteCategory]
        ).default;

        const categoryInfo = allQuotes.quotes;

        const quoteInfo =
            categoryInfo[Math.floor(Math.random() * categoryInfo.length)];

        return {
            category: textCategory,
            text: quoteInfo.text.split(" "),
            source: quoteInfo.source,
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
            category: textCategory,
            text,
            source: categoryInfo.source,
        };
    }

    return null;
};
