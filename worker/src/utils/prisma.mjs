import { PrismaClient } from "../prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const client = new PrismaClient({
  adapter,
});
