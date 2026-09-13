#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const env = {
    ...process.env,
    NODE_ENV: 'test',
    DB_PATH: ':memory:',
    JWT_SECRET: process.env.JWT_SECRET || 'test-only-secret-change-me-32-characters',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@test.local',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Test_Admin_2026!'
};

const jestBin = path.join(__dirname, '..', 'node_modules', 'jest', 'bin', 'jest.js');
const result = spawnSync(process.execPath, [jestBin, '--runInBand', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env
});

process.exit(result.status ?? 1);
