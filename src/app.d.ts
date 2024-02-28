/// <reference types="lucia" />
declare global {
    namespace App {
        interface Locals {
            auth: import("lucia").AuthRequest;
            user: import("lucia").User | undefined;
        }
    }
    namespace Lucia {
        type Auth = import("$lib/server/lucia").Auth;
        type DatabaseUserAttributes = {
            name: string;
            email: string;
            rating: number;
            avatar: string;
            fontScale: number;
        };
        type DatabaseSessionAttributes = {};
    }

    var __prisma: import("@prisma/client").PrismaClient;
}

export {};
