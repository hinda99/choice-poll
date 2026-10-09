import fs from "fs/promises";
import path from "path";
import { EventEmitter } from "events";
import { Poll, CreatePollInput } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "polls.json");

// In-memory cache for fast read/writes
let pollsCache: Record<string, Poll> | null = null;
export const pollEvents = new EventEmitter();
pollEvents.setMaxListeners(500);

// Per-poll async mutex queue to serialize concurrent vote transactions
const pollLocks = new Map<string, Promise<unknown>>();

async function withPollLock<T>(pollId: string, task: () => Promise<T>): Promise<T> {
  const prevLock = pollLocks.get(pollId) || Promise.resolve();
  let release: () => void = () => {};
  const currentLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  pollLocks.set(pollId, currentLock);

  try {
    await prevLock;
    return await task();
  } finally {
    release();
    if (pollLocks.get(pollId) === currentLock) {
      pollLocks.delete(pollId);
    }
  }
}

async function ensureDataFile(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(DATA_FILE);
    } catch {
      await fs.writeFile(DATA_FILE, JSON.stringify({}, null, 2), "utf-8");
    }
  } catch (error) {
    console.error("Failed to ensure data file:", error);
  }
}

async function loadPolls(): Promise<Record<string, Poll>> {
  if (pollsCache !== null) {
    return pollsCache;
  }
  await ensureDataFile();
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    pollsCache = JSON.parse(raw);
    return pollsCache || {};
  } catch {
    pollsCache = {};
    return pollsCache;
  }
}

async function savePolls(polls: Record<string, Poll>): Promise<void> {
  pollsCache = polls;
  await ensureDataFile();
  const nonce = Math.random().toString(36).substring(2, 8);
  const tempFile = `${DATA_FILE}.${Date.now()}-${nonce}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(polls, null, 2), "utf-8");

  // Robust atomic rename with retry on Windows to eliminate transient file lock collisions
  let renamed = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await fs.rename(tempFile, DATA_FILE);
      renamed = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  if (!renamed) {
    await fs.copyFile(tempFile, DATA_FILE);
    await fs.unlink(tempFile).catch(() => {});
  }
}

function generateId(length: number = 6): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createPoll(input: CreatePollInput): Promise<Poll> {
  const polls = await loadPolls();
  let id = generateId();
  while (polls[id]) {
    id = generateId();
  }

  const cleanQuestion = input.question?.trim() || "";
  if (cleanQuestion.length < 1 || cleanQuestion.length > 300) {
    throw new Error("Question must be between 1 and 300 characters.");
  }

  const cleanOptions = (input.options || [])
    .map((opt) => (typeof opt === "string" ? opt.trim() : ""))
    .filter((opt) => opt.length > 0);

  if (cleanOptions.length < 2) {
    throw new Error("A poll must have at least 2 non-empty choices.");
  }

  if (cleanOptions.length > 25) {
    throw new Error("A poll can have at most 25 choices.");
  }

  for (const opt of cleanOptions) {
    if (opt.length > 150) {
      throw new Error(`Choice "${opt.slice(0, 20)}..." exceeds maximum limit of 150 characters.`);
    }
  }

  // Disallow duplicate options to avoid voter confusion
  const seenOptions = new Set<string>();
  for (const opt of cleanOptions) {
    const lower = opt.toLowerCase();
    if (seenOptions.has(lower)) {
      throw new Error(`Duplicate choice detected: "${opt}". Each option must be distinct.`);
    }
    seenOptions.add(lower);
  }

  const isElim = !!input.isEliminationMode;
  const maxPerOption = isElim
    ? Math.min(200, Math.max(1, Number(input.maxPerOption) || 1))
    : undefined;

  const maxTotalVotes = input.maxTotalVotes
    ? Math.min(200, Math.max(1, Number(input.maxTotalVotes)))
    : undefined;

  const timeLimitHours = input.timeLimitHours
    ? Math.min(24, Math.max(1, Number(input.timeLimitHours)))
    : undefined;

  const expiresAt = timeLimitHours
    ? new Date(Date.now() + timeLimitHours * 60 * 60 * 1000).toISOString()
    : undefined;

  const creatorKey = generateId(14);

  const poll: Poll = {
    id,
    creatorKey,
    question: cleanQuestion,
    isMultipleChoice: !!input.isMultipleChoice,
    isEliminationMode: isElim,
    maxPerOption,
    maxTotalVotes,
    timeLimitHours,
    expiresAt,
    createdAt: new Date().toISOString(),
    totalVotes: 0,
    voteRecords: [],
    options: cleanOptions.map((text, idx) => ({
      id: `opt-${idx + 1}`,
      text,
      votes: 0,
      isEliminated: false,
      maxClaims: isElim ? maxPerOption : undefined,
      claimedBy: [],
    })),
  };

  polls[id] = poll;
  await savePolls(polls);
  return poll;
}

export function sanitizePollForPublic(poll: Poll): Poll {
  return {
    ...poll,
    creatorKey: undefined,
    voteRecords: undefined,
    options: poll.options.map((opt) => ({
      ...opt,
      claimedBy: undefined, // Protect voter privacy from public viewers
    })),
  };
}

export async function getPoll(id: string): Promise<Poll | null> {
  const polls = await loadPolls();
  return polls[id] || null;
}

export async function votePoll(
  pollId: string,
  optionIds: string[],
  voterName: string
): Promise<{ poll: Poll }> {
  return withPollLock(pollId, async () => {
    const polls = await loadPolls();
    const poll = polls[pollId];

    if (!poll) {
      throw new Error("Poll not found.");
    }

    // Check if poll has reached max total votes
    if (poll.maxTotalVotes && poll.totalVotes >= poll.maxTotalVotes) {
      throw new Error(
        `This poll has reached its maximum capacity of ${poll.maxTotalVotes} votes.`
      );
    }

    // Check if poll has expired
    if (poll.expiresAt && new Date() > new Date(poll.expiresAt)) {
      throw new Error("This poll has expired! Voting has closed.");
    }

    const cleanName = typeof voterName === "string" ? voterName.trim() : "";
    if (!cleanName || cleanName.length < 2) {
      throw new Error("Please enter your full name (at least 2 characters) to vote.");
    }
    if (cleanName.length > 100) {
      throw new Error("Voter full name cannot exceed 100 characters.");
    }

    if (!Array.isArray(optionIds) || optionIds.length === 0) {
      throw new Error("You must select at least one option.");
    }

    const cleanOptionIds = Array.from(new Set(optionIds));

    if (!poll.isMultipleChoice && cleanOptionIds.length > 1) {
      throw new Error("This poll only permits a single choice.");
    }

    // Validate options exist in poll
    for (const optId of cleanOptionIds) {
      const option = poll.options.find((o) => o.id === optId);
      if (!option) {
        throw new Error(`Option ${optId} does not exist in this poll.`);
      }

      // In elimination mode: check capacity limit (up to max claims)
      if (poll.isEliminationMode) {
        const limit = option.maxClaims || poll.maxPerOption || 1;
        if (option.isEliminated || option.votes >= limit) {
          throw new Error(
            `Option "${option.text}" is full! All ${limit} spots have been claimed.`
          );
        }
      }
    }

    // Increment votes and handle elimination & claimedBy
    const now = new Date().toISOString();
    for (const optId of cleanOptionIds) {
      const option = poll.options.find((o) => o.id === optId);
      if (option) {
        option.votes += 1;
        if (poll.isEliminationMode) {
          if (!option.claimedBy) option.claimedBy = [];
          option.claimedBy.push(cleanName);

          const limit = option.maxClaims || poll.maxPerOption || 1;
          if (option.votes >= limit) {
            option.isEliminated = true;
            option.claimedAt = now;
          }
        }
      }
    }

    if (!poll.voteRecords) {
      poll.voteRecords = [];
    }
    poll.voteRecords.push({
      id: `v-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      voterName: cleanName,
      optionIds: cleanOptionIds,
      createdAt: now,
    });

    poll.totalVotes += 1;
    polls[pollId] = poll;
    await savePolls(polls);

    // Broadcast update to real-time subscribers
    pollEvents.emit(`update:${pollId}`, poll);

    return { poll };
  });
}
