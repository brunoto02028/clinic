/**
 * Pulls every object out of the R2 bucket into a local folder.
 *
 * The exercise library moved to R2 and stopped being captured by anything:
 * backup.ps1 saves the database, the code and the server's uploads folder,
 * but the videos themselves live only in the bucket. A bucket is durable,
 * not backed up — an accidental delete or a wrong prefix sweep takes the
 * whole library with it, and re-filming 177 videos is not a recovery plan.
 *
 * Usage: node scripts/backup-r2.js <destination-folder>
 * Requires R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.
 */
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");

const dest = process.argv[2];
if (!dest) {
  console.error("usage: node scripts/backup-r2.js <destination-folder>");
  process.exit(1);
}

const required = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("missing environment variables: " + missing.join(", "));
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const Bucket = process.env.R2_BUCKET_NAME;

async function listAll() {
  const out = [];
  let token;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket, ContinuationToken: token }));
    for (const o of r.Contents || []) out.push({ key: o.Key, size: o.Size || 0 });
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return out;
}

(async () => {
  const objects = await listAll();
  const totalBytes = objects.reduce((s, o) => s + o.size, 0);
  console.log(`bucket ${Bucket}: ${objects.length} objects, ${(totalBytes / 1048576).toFixed(1)} MB`);

  let done = 0, skipped = 0, failed = 0, bytes = 0;

  for (const obj of objects) {
    const target = path.join(dest, obj.key);
    fs.mkdirSync(path.dirname(target), { recursive: true });

    // Resume-friendly: an object already on disk at the right size is not
    // re-fetched, so a run interrupted halfway costs only what it missed.
    if (fs.existsSync(target) && fs.statSync(target).size === obj.size) {
      skipped++; bytes += obj.size;
      continue;
    }

    try {
      const r = await s3.send(new GetObjectCommand({ Bucket, Key: obj.key }));
      await pipeline(r.Body, fs.createWriteStream(target));
      const written = fs.statSync(target).size;
      if (written !== obj.size) {
        throw new Error(`size mismatch: expected ${obj.size}, wrote ${written}`);
      }
      done++; bytes += written;
    } catch (err) {
      failed++;
      console.error(`  FAILED ${obj.key}: ${err.message}`);
    }

    if ((done + skipped) % 50 === 0) {
      console.log(`  ${done + skipped}/${objects.length}…`);
    }
  }

  console.log(`downloaded ${done}, already present ${skipped}, failed ${failed}`);
  console.log(`total on disk: ${(bytes / 1048576).toFixed(1)} MB of ${(totalBytes / 1048576).toFixed(1)} MB`);

  // A backup that quietly saved 350 of 354 files is worse than one that fails
  // loudly, because it is trusted.
  if (failed > 0) {
    console.error("BACKUP INCOMPLETE — see failures above");
    process.exit(1);
  }
  console.log("R2 backup complete");
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
