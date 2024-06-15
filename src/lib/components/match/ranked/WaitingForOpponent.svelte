<script lang="ts">
    export let endTime: number | null = null;
    export let currentTime: number;
</script>

{#if endTime}
    {@const timeLeft = Math.max(0, endTime - currentTime)}
    <slot />
    <div>
        Time left: {Math.floor(timeLeft / 1000)}
    </div>
{/if}
