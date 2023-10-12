<script lang="ts">
    import { io } from "socket.io-client";
    import { onDestroy } from "svelte";

    const socket = io();

    let count = 0;

    socket.on("name", (message) => {
        console.log(message);
    });

    onDestroy(() => {
        socket.disconnect();
    });

    $: {
        socket.emit("updateValue", count);
    }
</script>

<section>Ranked Match</section>

<button on:click={() => count++}>Increment</button>
<div>{count}</div>
