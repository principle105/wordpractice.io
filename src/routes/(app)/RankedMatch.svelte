<script lang="ts">
    // TODO: add max wrong characters and add server-side validation for it
    import { io } from "socket.io-client";
    import { onDestroy, onMount } from "svelte";
    import type { User } from "lucia";
    import { useMatchMode } from "$lib/stores/store";
    import type {
        Character,
        Delete,
        ExistingRoom,
        MatchUser,
        Replay,
        RoomInfo,
    } from "$lib/types";
    import { calculateWpm, convertReplayToText, getCorrect } from "$lib/utils";
    import OpponentDisplay from "./OpponentDisplay.svelte";
    import Cursor from "./Cursor.svelte";

    const match = useMatchMode();

    export let user: User | undefined;
    export let sessionId: string | undefined;

    let matchUsers = new Map<string, MatchUser>();
    let replay: Replay;
    let roomInfo: RoomInfo | null;

    let currentIndex: number = 0;
    let currentWordInput: string = "";
    let wpm: number = 0;

    const socket = io({
        query: {
            token: sessionId,
        },
    });

    socket.on("existing-room-info", (existingRoomInfo: ExistingRoom) => {
        if (existingRoomInfo.users.length !== 0) {
            matchUsers = new Map(
                existingRoomInfo.users.map((user) => [user.data.id, user])
            );
        }

        roomInfo = {
            quote: existingRoomInfo.quote,
            startTime: existingRoomInfo.startTime,
        };
    });

    socket.on("update-user", (matchUser: MatchUser) => {
        matchUsers.set(matchUser.data.id, matchUser);
        matchUsers = matchUsers;
    });

    socket.on("disconnect", () => {
        match.set(null);
    });

    onMount(() => {
        const interval = setInterval(() => {
            if (correct.length === roomInfo.quote.join(" ").length) {
                clearInterval(interval);
                wpm = calculateWpm(
                    replay[replay.length - 1]?.timestamp,
                    replay[0]?.timestamp,
                    correct.length
                );
            } else {
                wpm = calculateWpm(
                    Date.now(),
                    replay[0]?.timestamp,
                    correct.length
                );
            }
        }, 250);

        return () => clearInterval(interval);
    });

    onDestroy(() => {
        socket.disconnect();
    });

    $: user, replay, updateUser();

    const updateUser = () => {
        socket.emit("update-user", {
            data: user as User,
            replay,
        } satisfies MatchUser);
    };

    const handleInput = (e: InputEvent) => {
        if (e.target === null) return;

        let charsRemoved =
            replayText.slice(currentIndex).join(" ").length -
            currentWordInput.length;

        if (e.data !== null) {
            charsRemoved++;
        }

        if (charsRemoved > 0) {
            replay.push({
                type: "delete",
                amount: charsRemoved,
                timestamp: Date.now(),
            } satisfies Delete);
        }

        if (
            e.data === " " &&
            quote[currentIndex] === replayText.slice(currentIndex).join(" ")
        ) {
            currentWordInput = "";
            currentIndex++;
        }

        if (e.data !== null) {
            replay.push({
                type: "character",
                letter: e.data,
                timestamp: Date.now(),
            } satisfies Character);
        }

        replay = replay;
    };

    $: replayText = convertReplayToText(replay).split(" ");
    $: ({ correct, incorrectChars } = getCorrect(replayText, roomInfo.quote));

    let wrapperElement: HTMLElement | null = null;
    const fontSize: number = 30;
</script>

{#each matchUsers as [_, matchUser]}
    <OpponentDisplay {matchUser} {roomInfo} />
{/each}

<div
    class="whitespace-pre-line relative font-mono"
    style="font-size: {fontSize}px"
>
    <span bind:this={wrapperElement}>
        <span class="text-black">{correct}</span><span class="bg-red-400"
            >{roomInfo.quote
                .join(" ")
                .slice(correct.length, correct.length + incorrectChars)}</span
        ><span class="text-zinc-500"
            >{roomInfo.quote
                .join(" ")
                .slice(correct.length + incorrectChars)}</span
        >
        <Cursor {fontSize} {replay} {correct} {wrapperElement} />
        {#each matchUsers as [_, matchUser]}
            <Cursor
                {fontSize}
                replay={matchUser.replay}
                correct={getCorrect(
                    convertReplayToText(matchUser.replay).split(" "),
                    roomInfo.quote
                ).correct}
                {wrapperElement}
                name={matchUser.data.name}
            />
        {/each}
    </span>
</div>

<div class="text-center mb-4">
    <span class="text-2xl font-bold">{wpm}</span>
    <span class="text-gray-500"> WPM</span>
</div>

<input
    type="text"
    lang="en"
    autocomplete="new-password"
    autocorrect="off"
    autocapitalize="off"
    spellcheck="false"
    maxlength={50}
    placeholder={replayText.join(" ") === "" ? "Type here" : ""}
    class="w-full p-3 outline-none border-zinc-500 border rounded-md"
    bind:value={currentWordInput}
    on:input={handleInput}
    autofocus
/>
