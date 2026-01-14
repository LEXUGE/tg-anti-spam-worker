#!/usr/bin/env bun

/**
 * Migration script to import state.json from Rust bot to Workers KV
 * 
 * Usage:
 *   bun run migrate-state.ts <path-to-state.json>
 */

import * as fs from 'fs';
import * as path from 'path';

interface StateFile {
    counters: Record<string, number>;
}

interface KVEntry {
    key: string;
    value: string;
}

async function migrateState(stateFilePath: string) {
    console.log(`Reading state file: ${stateFilePath}`);

    // Read and parse the state file
    const stateContent = fs.readFileSync(stateFilePath, 'utf-8');
    const state: StateFile = JSON.parse(stateContent);

    console.log(`Found ${Object.keys(state.counters).length} counter entries`);

    // Convert to KV format
    const kvEntries: KVEntry[] = [];

    for (const [key, value] of Object.entries(state.counters)) {
        // The Rust bot uses "userId:chatId" format
        // We need to convert to "userId:chatId" (same format)
        kvEntries.push({
            key: key,
            value: value.toString()
        });
    }

    // Write to bulk upload JSON file for wrangler
    const bulkUploadFile = path.join(process.cwd(), 'kv-bulk-upload.json');
    fs.writeFileSync(bulkUploadFile, JSON.stringify(kvEntries, null, 2));

    console.log(`\nCreated bulk upload file: ${bulkUploadFile}`);
    console.log(`Total entries: ${kvEntries.length}`);
    console.log(`\nTo upload to Workers KV, run:`);
    console.log(`  wrangler kv:bulk put kv-bulk-upload.json --namespace-id=<YOUR_KV_NAMESPACE_ID>`);
    console.log(`\nOr if using binding name:`);
    console.log(`  wrangler kv:bulk put kv-bulk-upload.json --binding=SPAM_STATE`);
    console.log(`\nTo find your namespace ID, run:`);
    console.log(`  wrangler kv:namespace list`);
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
    console.error('Error: Please provide path to state.json file');
    console.error('Usage: bun run migrate-state.ts <path-to-state.json>');
    process.exit(1);
}

const stateFilePath = args[0];

if (!fs.existsSync(stateFilePath)) {
    console.error(`Error: File not found: ${stateFilePath}`);
    process.exit(1);
}

migrateState(stateFilePath);
