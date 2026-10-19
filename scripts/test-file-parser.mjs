import { parseOptionsFromFile } from "../src/lib/file-parser.js";
import assert from "node:assert";

console.log("Testing parseOptionsFromFile...");

// Test 1: Plain TXT line by line
const txt1 = `
Apple
Banana
Cherry
`;
const res1 = parseOptionsFromFile(txt1, "fruits.txt");
assert.deepStrictEqual(res1, ["Apple", "Banana", "Cherry"]);
console.log("✓ Test 1: Plain TXT passed");

// Test 2: TXT with bullets and numbers
const txt2 = `
1. TypeScript
2) React 19
- Tailwind CSS
* Next.js
• PostgreSQL
`;
const res2 = parseOptionsFromFile(txt2, "tech.txt");
assert.deepStrictEqual(res2, ["TypeScript", "React 19", "Tailwind CSS", "Next.js", "PostgreSQL"]);
console.log("✓ Test 2: TXT with bullets and numbering passed");

// Test 3: CSV with commas and quotes
const csv1 = `
Choice A
"Choice B, with comma"
Choice C
`;
const res3 = parseOptionsFromFile(csv1, "options.csv");
assert.deepStrictEqual(res3, ["Choice A", "Choice B, with comma", "Choice C"]);
console.log("✓ Test 3: CSV with quotes and commas passed");

// Test 4: CSV with semicolon delimiter (French Excel)
const csv2 = `Option 1;Option 2;Option 3`;
const res4 = parseOptionsFromFile(csv2, "options.csv");
assert.deepStrictEqual(res4, ["Option 1", "Option 2", "Option 3"]);
console.log("✓ Test 4: Semicolon delimited CSV passed");

// Test 5: CSV with header
const csv3 = `
Options
Vanilla
Chocolate
Strawberry
`;
const res5 = parseOptionsFromFile(csv3, "ice-cream.csv");
assert.deepStrictEqual(res5, ["Vanilla", "Chocolate", "Strawberry"]);
console.log("✓ Test 5: CSV header removal passed");

// Test 6: 120 items truncation to 100
const manyItems = Array.from({ length: 120 }, (_, i) => `Option ${i + 1}`).join("\n");
const res6 = parseOptionsFromFile(manyItems, "many.txt");
assert.strictEqual(res6.length, 100);
assert.strictEqual(res6[0], "Option 1");
assert.strictEqual(res6[99], "Option 100");
console.log("✓ Test 6: 100-choice cap passed");

console.log("\nALL PARSER TESTS PASSED!");
