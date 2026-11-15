import { z } from "zod";
export const nickname = z.string().trim().min(2).max(24);
export const commandSchema = z.object({
  commandId: z.uuid(),
  kind: z.enum([
    "ADD",
    "REMOVE_SONG",
    "PREPARE",
    "START",
    "PAUSE",
    "RESUME",
    "SKIP",
    "TECHNICAL_CANCEL",
    "VOTE",
    "ENCORE",
    "TRANSFER",
    "REMOVE_PERSON",
    "SETTINGS",
    "LEAVE",
    "CLOSE",
    "REPORT",
    "PAIR",
    "REDEEM",
  ]),
  payload: z.record(z.string(), z.unknown()).default({}),
});
export type Command = z.infer<typeof commandSchema>;
export type State =
  | "LOBBY"
  | "PREPARING"
  | "PLAYING"
  | "PAUSED"
  | "VOTING"
  | "RESULTS"
  | "RECOVERY"
  | "CLOSED";
export interface Video {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: number;
  fetchedAt: number;
}
export interface Person {
  id: string;
  name: string;
  avatar: string;
  status: "ACTIVE" | "LEFT" | "REMOVED";
  turns: number;
  lastSeen: number;
}
export interface Song {
  id: string;
  personId: string;
  video: Video;
  seq: number;
  status:
    | "WAITING"
    | "RESERVED"
    | "PLAYING"
    | "COMPLETED"
    | "SKIPPED"
    | "FAILED"
    | "CANCELLED";
}
export interface Round {
  eligible: string[];
  votes: Record<string, number>;
  openedAt: number;
  deadline: number;
  closedAt?: number;
  reason?: string;
  sum?: number;
  count?: number;
  average?: number | null;
}
export interface Performance {
  id: string;
  songId: string;
  singerId: string;
  epoch: number;
  lastReport: number;
  startedAt?: number;
  endedAt?: number;
  turnApplied: boolean;
  turnReverted: boolean;
  isEncore: boolean;
  round?: Round;
  outcome?: string;
}
export interface Offer {
  personId: string;
  songId: string;
  state:
    "OFFERED" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "CANCELLED" | "CONSUMED";
}
export interface Room {
  id: string;
  code: string;
  name: string;
  hostId: string;
  state: State;
  recoveryFrom?: State;
  version: number;
  nextSeq: number;
  people: Person[];
  songs: Song[];
  current?: Performance;
  history: Performance[];
  offer?: Offer;
  epoch: number;
  stageSeen: number;
  settings: {
    entry: boolean;
    reactions: boolean;
    gifs: boolean;
    autoPlay?: boolean;
    scoreSound?: boolean;
    gifDisplay?: "normal" | "expanded" | "minimized";
  };
  autoPlayError?: string;
  createdAt: number;
  closedAt?: number;
  audit: { at: number; actor: string; action: string; target?: string }[];
}
export interface Actor {
  id: string;
  role: "member" | "stage";
  epoch?: number;
}
export type PublicPerformance = Omit<Performance, "round"> & {
  round?: Omit<Round, "votes" | "eligible"> & {
    received: number;
    eligibleCount: number;
  };
};
export interface Snapshot extends Omit<Room, "audit" | "current" | "history"> {
  current?: PublicPerformance;
  history: PublicPerformance[];
  queue: Song[];
  me: Actor;
  myVote?: number;
  canVote: boolean;
  serverTime: number;
  integrationMode: string;
}
