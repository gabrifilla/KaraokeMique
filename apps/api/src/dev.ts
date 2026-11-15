import "dotenv/config";

// Only this development entry point enables development conveniences by default.
process.env.NODE_ENV ??= "development";
await import("./main.js");
export {};
