<script lang="ts">
    import Modal from "$lib/components/misc/Modal.svelte";
    import { findErrorWithUsername } from "$lib/utils/validation";
    import type { User } from "@prisma/client";
    import toast from "svelte-french-toast";

    export let user: User;

    let newUsername = "";

    const changeUsername = async () => {
        const errorWithUsername = findErrorWithUsername(newUsername);

        if (errorWithUsername) {
            toast.error(errorWithUsername);
            return;
        }

        const res = await fetch(
            `/api/user/change-username?newUsername=${newUsername}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        if (res.ok) {
            user.pickedInitalUsername = true;
            user.username = newUsername;
        }
    };
</script>

<Modal isOpen={!user.pickedInitalUsername}>
    <h1 class="text-2xl text-center">Select Username</h1>
    <div>
        Usernames must be between 6 and 20 characters. Only letters, numbers and
        underscores are allowed.
    </div>
    <div>Keep in mind that you can only change your username once.</div>
    <input
        type="text"
        class="w-full p-3 outline-none border-zinc-500 border rounded-md mb-2"
        maxlength="20"
        placeholder={user.username}
        bind:value={newUsername}
    />
    <button
        class="outline-none rounded-lg bg-green-600 p-3 text-white"
        on:click={changeUsername}
    >
        Submit
    </button>
</Modal>
