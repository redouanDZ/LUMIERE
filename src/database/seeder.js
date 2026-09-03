const fs = require('fs');
const path = require('path');
const { query, run } = require('./db');

const runSeeds = async () => {
    const seedsDir = path.join(__dirname, 'seeds');
    const files = fs.readdirSync(seedsDir)
        .filter(f => f.endsWith('.js'))
        .sort();

    console.log('Running database seeds...');
    for (const file of files) {
        const seeder = require(path.join(seedsDir, file));
        await seeder.run({ query, run });
    }
    console.log('✓ Seeding completed.');
};

if (require.main === module) {
    require('dotenv').config();
    runSeeds().then(() => process.exit(0)).catch(err => {
        console.error('Seeding failed:', err);
        process.exit(1);
    });
}

module.exports = { runSeeds };
