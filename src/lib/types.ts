export interface VoteRecord {
  id: string;
  voterName: string;
  optionIds: string[];
  createdAt: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  isEliminated: boolean;
  maxClaims?: number; // Maximum times this choice can be picked before elimination (up to 10)
  claimedBy?: string[]; // Names of voters who claimed this option
  claimedAt?: string;
}

export interface Poll {
  id: string;
  creatorKey?: string; // Private key known only to the poll creator/owner
  question: string;
  isMultipleChoice: boolean;
  isEliminationMode: boolean; // When enabled, option is eliminated once reaching max claims
  maxPerOption?: number; // Up to 10 claims per choice
  maxTotalVotes?: number; // Poll-wide vote cap (up to 200)
  timeLimitHours?: number; // 1 to 24 hours
  expiresAt?: string; // ISO date string when poll closes
  createdAt: string;
  options: PollOption[];
  totalVotes: number;
  voteRecords?: VoteRecord[]; // List of all submitted votes with voter name
}

export interface CreatePollInput {
  question: string;
  options: string[]; // Up to 25 choices
  isMultipleChoice: boolean;
  isEliminationMode: boolean;
  maxPerOption?: number; // Up to 10
  maxTotalVotes?: number; // Up to 200
  timeLimitHours?: number; // 1 to 24 hours
}


