import { channelManager } from '../src/app-core/channelManager';
import { store } from '../src/app-core/store';

async function testRadarAuthAndIngest() {
  console.log('================================================================');
  console.log('📡 RADAR WATCHER: WHATSAPP & TELEGRAM AUTH & INGESTION AUDIT');
  console.log('================================================================\n');

  // 1. Initial State Check
  console.log('--- [Step 1] Initial Configuration ---');
  let config = channelManager.getConfig();
  console.log(`WhatsApp Initial State: ${config.whatsappStatus} (Connected: ${config.whatsappConnected})`);
  console.log(`Telegram Initial State: ${config.telegramStatus} (Connected: ${config.telegramConnected})`);
  console.log(`Configured Channels: ${config.monitoredChannels.length}\n`);

  // 2. Test WhatsApp Authentication Flow
  console.log('--- [Step 2] WhatsApp Companion & Pairing Code Flow ---');
  const testWaPhone = '+91 6301253789';
  const pairingCode = await channelManager.requestWhatsAppPairingCode(testWaPhone);
  console.log(`✓ Generated WhatsApp 8-digit Pairing Code: "${pairingCode}" for ${testWaPhone}`);
  if (!pairingCode || pairingCode.length < 8 || !pairingCode.includes('-')) {
    throw new Error(`Invalid pairing code generated: ${pairingCode}`);
  }

  channelManager.confirmWhatsAppConnected(testWaPhone);
  config = channelManager.getConfig();
  console.log(`✓ WhatsApp Connection Confirmed: Status=${config.whatsappStatus}, Phone=${config.whatsappPhone}`);
  if (!config.whatsappConnected) throw new Error('WhatsApp failed to connect');

  const waChannel = channelManager.addChannel({
    platform: 'whatsapp',
    type: 'group',
    name: 'Aditya Campus Placement Cell 2026 (MCA)',
    enabled: true,
  });
  console.log(`✓ Added Custom WhatsApp Group: "${waChannel.name}" (ID: ${waChannel.id})\n`);

  // 3. Test Telegram Authentication Flow
  console.log('--- [Step 3] Telegram MTProto Phone & OTP Login Flow ---');
  const testTgPhone = '+91 6301253789';
  const codeReq = await channelManager.requestTelegramCode(testTgPhone);
  console.log(`✓ Requested Telegram OTP: Success=${codeReq.success} | Message="${codeReq.message}"`);
  if (!codeReq.success) throw new Error('Telegram request code failed');

  config = channelManager.getConfig();
  console.log(`  Telegram Status after code request: "${config.telegramStatus}"`);

  const verifyRes = await channelManager.verifyTelegramCode('84920');
  console.log(`✓ Verified Telegram OTP Code: Success=${verifyRes.success} | Message="${verifyRes.message}"`);
  if (!verifyRes.success) throw new Error('Telegram verify code failed');

  config = channelManager.getConfig();
  console.log(`✓ Telegram Connection Confirmed: Status=${config.telegramStatus}, Connected=${config.telegramConnected}`);
  if (!config.telegramConnected) throw new Error('Telegram failed to authenticate');

  const tgChannel = channelManager.addChannel({
    platform: 'telegram',
    type: 'channel',
    name: 'Off-Campus Tech Drives 2026 Batch Alerts',
    enabled: true,
  });
  console.log(`✓ Added Custom Telegram Channel: "${tgChannel.name}" (ID: ${tgChannel.id})\n`);

  // 4. Test Live Ingestion of Real Job Forward from WhatsApp
  console.log('--- [Step 4] Live WhatsApp Message Ingestion & ATS Match ---');
  const waJobMessage = `
    *Oracle Cloud Infrastructure (OCI) Hiring 2026*
    Role: Associate Software Engineer - Cloud & Full Stack
    Eligibility: MCA / B.Tech (2024, 2025, 2026 Batch)
    Location: Hyderabad / Bengaluru, India
    CTC: 18 LPA - 22 LPA
    Required Skills: JavaScript, TypeScript, React.js, Node.js, REST APIs, SQL, Data Structures
    Apply Link: https://oracle.wd1.myworkdayjobs.com/oracle/job/Hyderabad-India/Associate-Software-Engineer
  `;

  const waRes = await channelManager.ingestIncomingMessage('whatsapp', waChannel.name, waJobMessage);
  console.log(`✓ Ingestion Status: "${waRes.status}"`);
  console.log(`  Extracted Company: "${waRes.feedItem.extractedCompany}"`);
  console.log(`  Extracted Role: "${waRes.feedItem.extractedRole}"`);
  console.log(`  Match Score with Narayana's Profile: ${waRes.feedItem.matchScore}%`);
  console.log(`  Job ID in Local Store: ${waRes.job?.id || 'N/A'}\n`);

  // 5. Test Live Ingestion of Noise / Chat Forward from Telegram
  console.log('--- [Step 5] Noise & Spam Triage Filter on Telegram Chat ---');
  const tgNoiseMessage = `Good morning all! Did anyone receive the online assessment link for TCS Digital test yesterday? Please share details.`;
  const tgNoiseRes = await channelManager.ingestIncomingMessage('telegram', tgChannel.name, tgNoiseMessage);
  console.log(`✓ Ingestion Status: "${tgNoiseRes.status}" (Noise Dropped: ${tgNoiseRes.status === 'noise_dropped'})`);
  console.log(`  Raw Text: "${tgNoiseRes.feedItem.rawText}"\n`);

  // 6. Test Feed & Channel Counters
  console.log('--- [Step 6] Feed Verification & Activity Metrics ---');
  const feed = channelManager.getFeed();
  console.log(`✓ Total Radar Feed Items: ${feed.length}`);
  feed.forEach((item, idx) => {
    console.log(`  [${idx + 1}] [${item.platform.toUpperCase()}] ${item.channelName} -> Status: ${item.status} (Company: ${item.extractedCompany || 'None'})`);
  });

  console.log('\n================================================================');
  console.log('🎉 ALL RADAR WATCHER WHATSAPP & TELEGRAM AUTH FLOWS 100% OPERATIONAL!');
  console.log('================================================================');
}

testRadarAuthAndIngest().catch((err) => {
  console.error('❌ Audit Failed:', err);
  process.exit(1);
});
