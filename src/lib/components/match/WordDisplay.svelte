<script lang="ts">
    import { BASE_FONT_SIZE, DEFAULT_MAX_LINES_SHOWN } from "$lib/config";
    import type { CasualMatchUser, Round } from "$lib/types";
    import {
        convertReplayToWords,
        getCompletedAndIncorrectWords,
        getStartTime,
    } from "$lib/utils/textProcessing";
    import type { User } from "@prisma/client";

    import Cursor from "./Cursor.svelte";

    export let round: Round;
    export let timeElapsed: number | null = null;

    export let matchUsers: Map<string, CasualMatchUser>;
    export let user: User;

    let wrapperElement: HTMLElement | null = null;
    let topPos = 0;
    let lastWordIndex = 0;

    const fontSize: number = user.fontScale * BASE_FONT_SIZE;

    $: userReplay = round.replays[user.id];

    const updateWrapperSize = () => {
        // Force updating the wrapper size
        wrapperElement = wrapperElement;
    };

    $: maxHeight =
        wrapperElement !== null
            ? wrapperElement.offsetHeight -
              DEFAULT_MAX_LINES_SHOWN * fontSize * 1.5
            : 0;

    $: wordsTyped = convertReplayToWords(userReplay, round.quote.text);

    $: ({ completedWords, incorrectChars } = getCompletedAndIncorrectWords(
        wordsTyped,
        round.quote.text
    ));

    $: clientUserTimingOffset = timeElapsed
        ? Date.now() - (timeElapsed + getStartTime(userReplay, round.startTime))
        : 0;
</script>

<svelte:window on:resize={updateWrapperSize} />

<div
    class="whitespace-pre-line font-mono overflow-hidden my-4 relative pb-2.5"
    style="font-size: {fontSize}px; max-height: {fontSize * 0.15 +
        fontSize * DEFAULT_MAX_LINES_SHOWN * 1.5}px;"
>
    <div
        class="ease-in transition-[margin-top] relative duration-150"
        style="margin-top: -{Math.min(topPos, maxHeight)}px;"
        bind:this={wrapperElement}
    >
        <span class="text-black">{completedWords}</span><span class="bg-red-400"
            >{round.quote.text
                .join(" ")
                .slice(
                    completedWords.length,
                    completedWords.length + incorrectChars
                )}</span
        ><span class="text-zinc-500"
            >{round.quote.text
                .join(" ")
                .slice(completedWords.length + incorrectChars)}</span
        >
        {#each Object.entries(round.replays) as [matchUserId, matchUserReplay]}
            {@const matchUser = matchUsers.get(matchUserId)}
            {#if user.id !== matchUserId && matchUser}
                {@const timingOffset = timeElapsed
                    ? Date.now() -
                      (timeElapsed +
                          getStartTime(matchUserReplay, round.startTime))
                    : 0}
                <Cursor
                    {fontSize}
                    {timingOffset}
                    replay={matchUserReplay}
                    {wrapperElement}
                    username={matchUser.username}
                    text={round.quote.text}
                    clientUserLastIndex={lastWordIndex}
                />
            {/if}
        {/each}
    </div>
    <Cursor
        {fontSize}
        timingOffset={clientUserTimingOffset}
        replay={userReplay}
        {wrapperElement}
        bind:topPos
        bind:lastWordIndex
        text={round.quote.text}
    />
</div>
