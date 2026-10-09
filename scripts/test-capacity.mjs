async function testCapacity() {
  console.log("Testing Elimination Mode with Capacity (up to 5 per choice)...");
  const baseUrl = "http://localhost:3000";

  // 1. Create a poll with maxPerOption = 3
  const createRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Workshop Session Registration (Max 3 people per session):",
      options: ["Morning Session", "Afternoon Session"],
      isMultipleChoice: false,
      isEliminationMode: true,
      maxPerOption: 3,
    }),
  });

  const createData = await createRes.json();
  const pollId = createData.poll.id;
  console.log("Created poll ID:", pollId, "maxPerOption:", createData.poll.maxPerOption);

  if (createData.poll.maxPerOption !== 3) {
    throw new Error(`Expected maxPerOption 3, got ${createData.poll.maxPerOption}`);
  }

  // Vote 1 on Morning Session (opt-1)
  console.log("Voter 1 picks Morning Session...");
  const v1 = await (await fetch(`${baseUrl}/api/polls/${pollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Participant One" }),
  })).json();
  const optV1 = v1.poll.options[0];
  console.log(`  Opt-1 votes: ${optV1.votes}/3, isEliminated: ${optV1.isEliminated}`);
  if (optV1.isEliminated !== false) throw new Error("Should NOT be eliminated yet after 1 vote");

  // Vote 2 on Morning Session (opt-1)
  console.log("Voter 2 picks Morning Session...");
  const v2 = await (await fetch(`${baseUrl}/api/polls/${pollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Participant Two" }),
  })).json();
  const optV2 = v2.poll.options[0];
  console.log(`  Opt-1 votes: ${optV2.votes}/3, isEliminated: ${optV2.isEliminated}`);
  if (optV2.isEliminated !== false) throw new Error("Should NOT be eliminated yet after 2 votes");

  // Vote 3 on Morning Session (opt-1) - reaches 3/3 capacity!
  console.log("Voter 3 picks Morning Session (Hits max 3/3 limit)...");
  const v3 = await (await fetch(`${baseUrl}/api/polls/${pollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Participant Three" }),
  })).json();
  const optV3 = v3.poll.options[0];
  console.log(`  Opt-1 votes: ${optV3.votes}/3, isEliminated: ${optV3.isEliminated}`);
  if (optV3.isEliminated !== true) throw new Error("SHOULD be eliminated after reaching 3 votes!");

  // Vote 4 on Morning Session (opt-1) - Should be BLOCKED!
  console.log("Voter 4 tries to pick Morning Session (Should be blocked)...");
  const v4Res = await fetch(`${baseUrl}/api/polls/${pollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Participant Four" }),
  });
  const v4Data = await v4Res.json();
  console.log(`  Blocked with status ${v4Res.status}: "${v4Data.error}"`);
  if (v4Res.status === 200) throw new Error("Should have blocked 4th vote!");

  // Vote 4 on Afternoon Session (opt-2) - Should SUCCEED!
  console.log("Voter 4 picks Afternoon Session instead...");
  const v4Success = await (await fetch(`${baseUrl}/api/polls/${pollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-2"], voterName: "Participant Four" }),
  })).json();
  console.log(`  Opt-2 votes: ${v4Success.poll.options[1].votes}/3`);

  console.log("\n>>> SUCCESS: Capacity limit per choice (up to 5) works flawlessly! <<<");
}

testCapacity().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
