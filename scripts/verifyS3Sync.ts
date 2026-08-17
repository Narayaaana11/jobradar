import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const config = {
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  bucket: process.env.AWS_S3_BUCKET || 'jobsprep',
};

async function testS3() {
  console.log(`=== TESTING DIRECT S3 CONNECTION TO BUCKET '${config.bucket}' ===`);
  const client = new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  // 1. Upload a test snapshot
  const testPayload = JSON.stringify({
    app: 'JobRadar Windows Desktop Edition',
    status: 'ACTIVE_S3_CLOUD_SYNC',
    timestamp: new Date().toISOString(),
  }, null, 2);

  const putCmd = new PutObjectCommand({
    Bucket: config.bucket,
    Key: 'data/test_connection.json',
    Body: new TextEncoder().encode(testPayload),
    ContentType: 'application/json',
  });

  await client.send(putCmd);
  console.log(`[✓] Successfully wrote 'data/test_connection.json' to S3 bucket '${config.bucket}'`);

  // 2. List objects
  const listCmd = new ListObjectsV2Command({
    Bucket: config.bucket,
    Prefix: 'data/',
    MaxKeys: 10,
  });

  const listRes = await client.send(listCmd);
  console.log(`[✓] Objects found under 'data/':`, (listRes.Contents || []).map(o => o.Key));

  console.log('=== AWS S3 SYNC IS 100% OPERATIONAL! ===');
}

testS3().catch(err => {
  console.error('[!] S3 Test failed:', err.message);
});
