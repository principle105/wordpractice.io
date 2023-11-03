<script lang="ts">
    import { DEFAULT_LINES_SHOWN } from "$lib/config";
    import type { MatchUser, Replay, RoomInfo } from "$lib/types";
    import { convertReplayToText, getCorrect } from "$lib/utils";
    import Cursor from "./Cursor.svelte";

    export let roomInfo: RoomInfo;
    export let fontSize: number;
    export let correctInput: string;
    export let incorrectChars: number;
    export let timingOffset: number = 0;

    export let replay: Replay;
    export let matchUsers: MatchUser[];

    let wrapperElement: HTMLElement | null = null;
    let topPos: number = 0;
</script>

<div
    class="whitespace-pre-line relative font-mono overflow-hidden"
    style="font-size: {fontSize}px; height: {fontSize * 0.15 +
        fontSize * DEFAULT_LINES_SHOWN * 1.5}px;"
>
    <div
        bind:this={wrapperElement}
        class="absolute left-0 ease-in duration-300"
        style="top: -{topPos}px; transition: top 0.08s;"
    >
        <span class="text-black">{correctInput}</span><span class="bg-red-400"
            >{roomInfo.quote
                .join(" ")
                .slice(
                    correctInput.length,
                    correctInput.length + incorrectChars
                )}</span
        ><span class="text-zinc-500"
            >{roomInfo.quote
                .join(" ")
                .slice(correctInput.length + incorrectChars)}</span
        >
        {#each matchUsers as matchUser}
            <Cursor
                {fontSize}
                {timingOffset}
                replay={matchUser.replay}
                correctInput={getCorrect(
                    convertReplayToText(matchUser.replay),
                    roomInfo.quote
                ).correct}
                {wrapperElement}
                name={matchUser.name}
                quote={roomInfo.quote}
            />
        {/each}
    </div>
    <Cursor
        {fontSize}
        {timingOffset}
        {replay}
        {correctInput}
        {wrapperElement}
        bind:topPos
        quote={roomInfo.quote}
    />
</div>
