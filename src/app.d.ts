import "unplugin-icons/types/svelte";

declare global {
    namespace App {
        interface Locals {
            user: import("@prisma/client").User | null;
            session: import("lucia").Session | null;
        }
        interface PageData {
            flash?: { type: "success" | "error"; message: string };
        }
    }
}
export {};
