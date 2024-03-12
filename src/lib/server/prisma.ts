import type { PrismaClient as ImportedPrismaClient } from "@prisma/client";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const { PrismaClient: RequiredPismaClient } = require("@prisma/client");
const _PrismaClient = RequiredPismaClient as typeof ImportedPrismaClient;

export class PrismaClient extends _PrismaClient {}
