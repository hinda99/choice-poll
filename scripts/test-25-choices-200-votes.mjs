async function test25ChoicesAnd200Votes() {
  console.log("Testing 25 Choices and 200 Votes limit...");
  const baseUrl = "http://localhost:3000";

  // Test 1: Create a poll with exactly 25 choices
  const choices25 = Array.from({ length: 25 }, (_, i) => `Option ${i + 1}`);
  console.log(`Creating poll with ${choices25.length} choices...`);

  const res25 = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Which of these 25 technologies do you use most?",
      options: choices25,
      isMultipleChoice: true,
      isEliminationMode: false,
      maxTotalVotes: 200,
    }),
  });

  const data25 = await res25.json();
  console.log("Poll Created Status:", res25.status, "ID:", data25.poll?.id);
  console.log("Number of Options in Poll:", data25.poll?.options.length);
  console.log("Max Total Votes:", data25.poll?.maxTotalVotes);

  if (data25.poll?.options.length !== 25) {
    throw new Error(`Expected 25 options, got ${data25.poll?.options.length}`);
  }
  if (data25.poll?.maxTotalVotes !== 200) {
    throw new Error(`Expected maxTotalVotes 200, got ${data25.poll?.maxTotalVotes}`);
  }

  // Test 2: Rejecting > 25 choices (e.g. 26 choices)
  const choices26 = Array.from({ length: 26 }, (_, i) => `Option ${i + 1}`);
  console.log(`\nTesting rejection of ${choices26.length} choices...`);
  const res26 = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Too many choices test",
      options: choices26,
    }),
  });
  const data26 = await res26.json();
  console.log(`Rejection Status: ${res26.status}, Error: "${data26.error}"`);
  if (res26.status === 200) {
    throw new Error("Should have rejected 26 choices!");
  }

  // Test 3: Elimination mode with 200 votes per choice capacity
  console.log("\nTesting Elimination mode with 200 capacity per choice...");
  const resElim200 = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Conference Room Allocation (Up to 200 per room):",
      options: ["Auditorium A", "Auditorium B"],
      isEliminationMode: true,
      maxPerOption: 200,
      maxTotalVotes: 200,
    }),
  });
  const dataElim200 = await resElim200.json();
  const pollElim = dataElim200.poll;
  console.log("Elimination Poll Created:", pollElim.id);
  console.log("Option 1 maxClaims:", pollElim.options[0].maxClaims);
  if (pollElim.options[0].maxClaims !== 200) {
    throw new Error(`Expected 200 maxClaims, got ${pollElim.options[0].maxClaims}`);
  }

  // Test 4: Vote Quota Enforcement
  console.log("\nTesting Vote Quota Lock (e.g. quota of 2 votes)...");
  const quotaPollRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Quick 2-vote quota test",
      options: ["Yes", "No"],
      maxTotalVotes: 2,
    }),
  });
  const quotaPoll = (await quotaPollRes.json()).poll;

  // Vote 1
  await fetch(`${baseUrl}/api/polls/${quotaPoll.id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Voter 1" }),
  });

  // Vote 2 (reaches quota = 2)
  await fetch(`${baseUrl}/api/polls/${quotaPoll.id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-2"], voterName: "Voter 2" }),
  });

  // Vote 3 (should be BLOCKED)
  const vote3Res = await fetch(`${baseUrl}/api/polls/${quotaPoll.id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Voter 3" }),
  });
  const vote3Data = await vote3Res.json();
  console.log(`Vote 3 Status (Quota Lock): ${vote3Res.status}, Error: "${vote3Data.error}"`);
  if (vote3Res.status === 200) {
    throw new Error("Should have blocked voting after quota reached!");
  }

  console.log("\n>>> ALL TESTS FOR 25 CHOICES AND 200 VOTES PASSED 100%! <<<");
}

test25ChoicesAnd200Votes().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
