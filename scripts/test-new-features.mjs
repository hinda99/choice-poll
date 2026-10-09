async function testNewFeatures() {
  console.log("Testing Full Name, Export to Sheets, and Time Limit (up to 24h)...");
  const baseUrl = "http://localhost:3000";

  // 1. Create poll with 24h time limit
  const createRes = await fetch(`${baseUrl}/api/polls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "Team Hackathon Project Sign-ups (24h limit):",
      options: ["Project Alpha (AI)", "Project Beta (Mobile)", "Project Gamma (Cloud)"],
      isMultipleChoice: false,
      isEliminationMode: true,
      maxPerOption: 2,
      timeLimitHours: 24,
    }),
  });

  const createData = await createRes.json();
  const poll = createData.poll;
  console.log("Created Poll ID:", poll.id);
  console.log("Time Limit Hours:", poll.timeLimitHours);
  console.log("Expires At:", poll.expiresAt);

  if (poll.timeLimitHours !== 24 || !poll.expiresAt) {
    throw new Error("Failed to set 24h expiration on poll");
  }

  // 2. Try voting without full name (should fail)
  console.log("\nVoter attempts to vote without a full name (Should fail)...");
  const noNameRes = await fetch(`${baseUrl}/api/polls/${poll.id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "" }),
  });
  const noNameData = await noNameRes.json();
  console.log(`Status: ${noNameRes.status}, Error: "${noNameData.error}"`);
  if (noNameRes.status === 200) throw new Error("Should have required full name!");

  // 3. Voter 1 votes with full name: Alice Smith
  console.log("\nAlice Smith votes for 'Project Alpha'...");
  const v1 = await (await fetch(`${baseUrl}/api/polls/${poll.id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Alice Smith" }),
  })).json();
  console.log(`Alice Smith vote recorded! Opt-1 claimed by: ${v1.poll.options[0].claimedBy?.join(", ")}`);

  // 4. Voter 2 votes with full name: Bob Martin
  console.log("\nBob Martin votes for 'Project Alpha'...");
  const v2 = await (await fetch(`${baseUrl}/api/polls/${poll.id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-1"], voterName: "Bob Martin" }),
  })).json();
  console.log(`Bob Martin vote recorded! Opt-1 claimed by: ${v2.poll.options[0].claimedBy?.join(", ")}`);
  console.log(`Opt-1 is now eliminated? ${v2.poll.options[0].isEliminated}`);

  // 5. Voter 3 votes for 'Project Beta': Charlie Brown
  console.log("\nCharlie Brown votes for 'Project Beta'...");
  const v3 = await (await fetch(`${baseUrl}/api/polls/${poll.id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: ["opt-2"], voterName: "Charlie Brown" }),
  })).json();

  // 6. Test Export to Sheets / CSV endpoint
  console.log("\nTesting Export to Sheets endpoint: /api/polls/[id]/export...");
  const exportRes = await fetch(
    `${baseUrl}/api/polls/${poll.id}/export?adminKey=${createData.creatorKey}`
  );
  console.log(`Export Status: ${exportRes.status}`);
  console.log(`Content-Type: ${exportRes.headers.get("content-type")}`);
  console.log(`Content-Disposition: ${exportRes.headers.get("content-disposition")}`);

  const csvText = await exportRes.text();
  console.log("\n--- CSV Export Preview ---");
  console.log(csvText.substring(0, 700) + "...\n");

  if (!csvText.includes("Alice Smith") || !csvText.includes("Bob Martin") || !csvText.includes("Charlie Brown")) {
    throw new Error("CSV does not contain all voter names!");
  }
  if (!csvText.includes("Project Alpha") || !csvText.includes("Project Beta")) {
    throw new Error("CSV does not contain poll choices!");
  }

  console.log(">>> ALL NEW FEATURES VERIFIED AND PASSED 100%! <<<");
}

testNewFeatures().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
