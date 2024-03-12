export const lucia = new Lucia();

declare module "lucia" {
    interface Register {
        Lucia: typeof lucia;
        DatabaseSessionAttributes: DatabaseSessionAttributes;
        DatabaseUserAttributes: DatabaseUserAttributes;
    }
}

interface DatabaseSessionAttributes {}
interface DatabaseUserAttributes {
    id: string;
    name: string;
    email: string;
    rating: number;
    avatar: string;
    fontScale: number;
}

declare global {
    namespace App {
        interface Locals {
            user: import("lucia").User | null;
            session: import("lucia").Session | null;
        }
    }
}
