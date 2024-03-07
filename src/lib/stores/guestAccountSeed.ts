import { writable } from "svelte/store";
import { browser } from "$app/environment";
import { convertStringToInteger } from "$lib/utils";
import { GUEST_SEED_SIZE } from "$lib/config";

const getInitialValue = () => {
    if (browser) {
        const stored = window.localStorage.getItem("guestAccountSeed");

        if (stored) {
            const parsedValue = convertStringToInteger(stored);

            if (parsedValue !== null) {
                return parsedValue;
            }
        }
    }

    return Math.floor((Math.random() * 10) ^ GUEST_SEED_SIZE);
};

const initialValue = getInitialValue();

export const guestAccountSeed = writable<number>(initialValue);

guestAccountSeed.subscribe((value) => {
    if (browser) {
        window.localStorage.setItem("guestAccountSeed", value.toString());
    }
});
