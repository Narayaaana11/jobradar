import TelegramBot from 'node-telegram-bot-api';
import { ENV } from '../config/env';
import { RawQueue } from '../models/RawQueue';

export class TelegramService {
  private bot: TelegramBot | null = null;

  public init() {
    if (!ENV.TELEGRAM_BOT_TOKEN) {
      console.warn('[TelegramService] TELEGRAM_BOT_TOKEN not provided. Polling disabled.');
      return;
    }

    try {
      this.bot = new TelegramBot(ENV.TELEGRAM_BOT_TOKEN, { polling: true });
      console.log('[TelegramService] Telegram Bot initialized in polling mode.');

      this.bot.on('channel_post', (msg) => this.handleMessage(msg));
      this.bot.on('message', (msg) => this.handleMessage(msg));
      this.bot.on('callback_query', (query) => this.handleCallbackQuery(query));
      this.bot.on('polling_error', (error) => {
        console.error('[TelegramService] Polling error:', error.message);
      });
    } catch (err) {
      console.error('[TelegramService] Failed to initialize Telegram bot:', err);
    }
  }

  /**
   * Sends real-time high-match job alert cards with inline interactive buttons (autopilot-jobhunt standard).
   */
  public async sendJobAlertCard(chatId: string | number, job: any) {
    if (!this.bot) return;

    const messageText = `🚀 *HIGH MATCH JOB DETECTED!* (${job.matchScore}% Fit)\n\n` +
      `*Role:* ${job.jobTitle}\n` +
      `*Company:* ${job.companyName}\n` +
      `*Location:* ${job.location || 'Remote/Not specified'}\n` +
      `*Rubric Rating:* ⭐ ${job.rubricScores?.overallRubricRating || '4.0'} / 5.0\n` +
      `*ATS Keyword Density:* 📊 ${job.atsAnalysis?.keywordDensityScore || 85}%\n\n` +
      `*Matching Stack:* ${(job.gapAnalysis?.strongMatches || []).slice(0, 5).join(', ')}`;

    const options: TelegramBot.SendMessageOptions = {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '⚡ Approve & Auto-Apply', callback_data: `apply_${job.id}` },
            { text: '📄 View ATS Resume', callback_data: `resume_${job.id}` },
          ],
          [
            { text: '❌ Skip Job', callback_data: `reject_${job.id}` }
          ]
        ]
      }
    };

    try {
      await this.bot.sendMessage(chatId, messageText, options);
    } catch (e: any) {
      console.warn('[TelegramService] Could not send Telegram alert card:', e.message);
    }
  }

  private async handleCallbackQuery(query: TelegramBot.CallbackQuery) {
    if (!this.bot || !query.data) return;

    const [action, jobId] = query.data.split('_');
    const { jobRepository } = require('../repositories/jobRepository');

    try {
      if (action === 'apply') {
        const { AutoApplyService } = require('./autoApplyService');
        const autoApplyService = new AutoApplyService();
        const job = await jobRepository.findById(jobId);
        if (job) {
          await autoApplyService.prefillApplication(job);
          job.stage = 'applying';
          job.approvalStatus = 'approved';
          await job.save();
          await this.bot.answerCallbackQuery(query.id, { text: '⚡ Auto-apply pre-fill launched! Check dashboard for screenshot proof.' });
        }
      } else if (action === 'reject') {
        const job = await jobRepository.findById(jobId);
        if (job) {
          job.approvalStatus = 'rejected';
          job.stage = 'rejected';
          await job.save();
          await this.bot.answerCallbackQuery(query.id, { text: 'Job rejected.' });
        }
      } else if (action === 'resume') {
        await this.bot.answerCallbackQuery(query.id, { text: 'Opening ATS Tailored Resume...' });
      }
    } catch (e: any) {
      console.error('[TelegramService] Callback handling error:', e.message);
    }
  }

  private async handleMessage(msg: TelegramBot.Message) {
    if (!msg.text && !msg.caption) return;

    const rawText = msg.text || msg.caption || '';
    const channelName = msg.chat.title || msg.chat.username || `chat_${msg.chat.id}`;
    const rawMessageId = String(msg.message_id);

    try {
      await RawQueue.updateOne(
        { platform: 'telegram', channelName, rawMessageId },
        {
          $setOnInsert: {
            platform: 'telegram',
            channelName,
            rawMessageId,
            rawText,
            receivedAt: new Date(),
            processed: false,
            retryCount: 0,
          },
        },
        { upsert: true }
      );

      console.log(`[TelegramService] Ingested raw message ${rawMessageId} from ${channelName}`);
    } catch (err: any) {
      if (err.code !== 11000) {
        console.error('[TelegramService] Error storing raw message:', err);
      }
    }
  }
}

export const telegramService = new TelegramService();
