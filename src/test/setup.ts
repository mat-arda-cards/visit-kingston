// Runs before any test file (and, critically, before any store module is
// imported by a test) — several stores capture their file paths at module
// import time via dataPath()/dataDir(), so DATA_DIR must already point at a
// scratch directory by the time those modules load.
import { mkdtempSync } from "fs";
import os from "os";
import path from "path";

process.env.DATA_DIR = mkdtempSync(path.join(os.tmpdir(), "vk-test-"));
process.env.AUTH_SECRET = "test-secret";
