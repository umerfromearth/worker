import { createClient } from "redis";

export const client = createClient({
  url: "redis://192.168.100.52:6379"
});