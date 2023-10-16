<script lang="ts">
    import type { PageData } from "./$types";
    import { useMatchMode } from "$lib/stores/store";
    import CasualMatch from "./CasualMatch.svelte";
    import RankedMatch from "./RankedMatch.svelte";

    const match = useMatchMode();

    export let data: PageData;
</script>

{#if $match.type === "ranked"}
    <RankedMatch user={data.user} sessionId={data.sessionId} />
{:else if $match.type === "casual"}
    <CasualMatch />
{:else if $match.type === "private"}
    <section>
        <div>Private Room</div>
    </section>
{/if}
