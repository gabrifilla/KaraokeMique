import { pgTable, uuid, text, integer, jsonb } from "drizzle-orm/pg-core";
import type { Room } from "../../../packages/contracts/src/index.js";
export const rooms = pgTable("rooms", {
  id: uuid().primaryKey(),
  code: text().notNull().unique(),
  version: integer().notNull(),
  data: jsonb().$type<Room>().notNull(),
});
