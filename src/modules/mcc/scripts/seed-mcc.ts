import * as fs from 'fs';
import * as path from 'path';

async function seedMccCatalog() {
  console.log('Starting MCC catalog refresh and seeding...');

  const sourcePath = path.resolve(__dirname, '../data/mcc-catalog.json');
  const targetPath = path.resolve(
    __dirname,
    '../../database/seed-data/mcc-catalog-cache.json',
  );

  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (fs.existsSync(sourcePath)) {
    const rawData = fs.readFileSync(sourcePath, 'utf-8');
    fs.writeFileSync(targetPath, rawData, 'utf-8');
    console.log(
      `Successfully seeded/refreshed MCC catalog with ${JSON.parse(rawData).length} records.`,
    );
  } else {
    console.error('Source MCC catalog file not found!');
    process.exit(1);
  }
}

seedMccCatalog();
