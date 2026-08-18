import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
dotenv.config();

const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
const bucket = process.env.AWS_S3_BUCKET || 'jobsprep';

console.log('=== AWS S3 Connection Test ===');
console.log('Region:', region);
console.log('Bucket:', bucket);
console.log('Access Key ID:', accessKeyId.substring(0, 8) + '...');

const client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function runTest() {
  try {
    console.log('Testing S3 PutObject...');
    const payload = {
      test: true,
      timestamp: new Date().toISOString(),
      candidate: 'Veera Venkata Naga Satyanarayana Thota',
      message: 'JobRadar automated S3 cloud sync verified!',
    };

    const res = await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: 'data/connection_test.json',
      Body: JSON.stringify(payload, null, 2),
      ContentType: 'application/json',
    }));

    console.log('✅ PutObject succeeded! ETag:', res.ETag);

    console.log('Listing objects in s3://' + bucket + '/data/ ...');
    const listRes = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: 'data/',
    }));

    console.log('Objects found in S3 bucket:');
    (listRes.Contents || []).forEach((item) => {
      console.log(`  • ${item.Key} (${item.Size} bytes, LastModified: ${item.LastModified?.toISOString()})`);
    });

    console.log('\n🎉 S3 BUCKET IS FULLY OPERATIONAL AND CONNECTED VIA AWS!');
  } catch (err: any) {
    console.error('❌ S3 Connection Failed:', err.message);
    process.exit(1);
  }
}

runTest();
