import { IWatcherConfig, IChannelSource, IRadarFeedItem, IJob } from './types';
import { evaluateNoiseTriage } from './noiseFilter';
import { processIngestion } from './pipeline';
import { store } from './store';

const DEFAULT_CHANNELS: IChannelSource[] = [
  // WhatsApp Channels & Groups
  {
    id: 'wa-aditya-2026',
    platform: 'whatsapp',
    type: 'group',
    name: 'Aditya Placement Cell 2026 (MCA/BTech)',
    memberCount: 840,
    enabled: true,
    lastActiveAt: new Date().toISOString(),
    totalCaptured: 14,
  },
  {
    id: 'wa-offcampus-drives',
    platform: 'whatsapp',
    type: 'channel',
    name: 'Off-Campus Tech Drives - Pan India',
    memberCount: 15200,
    enabled: true,
    lastActiveAt: new Date().toISOString(),
    totalCaptured: 28,
  },
  {
    id: 'wa-mern-freshers',
    platform: 'whatsapp',
    type: 'group',
    name: 'MERN & Full-Stack Freshers Network',
    memberCount: 512,
    enabled: true,
    lastActiveAt: new Date().toISOString(),
    totalCaptured: 9,
  },

  // Telegram Channels & Groups
  {
    id: 'tg-placement-hub',
    platform: 'telegram',
    type: 'channel',
    name: 'OffCampusJobs4u - 2026 Batch Alerts',
    memberCount: 48500,
    enabled: true,
    lastActiveAt: new Date().toISOString(),
    totalCaptured: 42,
  },
  {
    id: 'tg-hyd-blr-tech',
    platform: 'telegram',
    type: 'channel',
    name: 'Hyderabad & Bengaluru SDE Openings',
    memberCount: 23100,
    enabled: true,
    lastActiveAt: new Date().toISOString(),
    totalCaptured: 19,
  },
  {
    id: 'tg-aditya-mca-career',
    platform: 'telegram',
    type: 'group',
    name: 'Aditya MCA 2024-2026 Career Connect',
    memberCount: 260,
    enabled: true,
    lastActiveAt: new Date().toISOString(),
    totalCaptured: 7,
  },
];

export class ChannelManagerService {
  private config: IWatcherConfig = {
    whatsappConnected: true,
    whatsappPhone: '+91 6301253789',
    telegramConnected: true,
    telegramPhone: '+91 6301253789',
    clipboardWatcherEnabled: true,
    minMatchScoreForToast: 80,
    monitoredChannels: DEFAULT_CHANNELS,
  };

  private feedItems: IRadarFeedItem[] = [
    {
      id: 'feed-1',
      platform: 'whatsapp',
      channelName: 'Aditya Placement Cell 2026 (MCA/BTech)',
      rawText: 'Amazon SDE Hiring. 2024/2025/2026 Batch. Location: Bengaluru/Hyderabad. CTC: 28 LPA. Apply Link: https://amazon.jobs/...',
      status: 'council_approved',
      extractedCompany: 'Amazon',
      extractedRole: 'SDE',
      matchScore: 97,
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
    {
      id: 'feed-2',
      platform: 'telegram',
      channelName: 'Hyderabad & Bengaluru SDE Openings',
      rawText: 'Good morning guys! Anyone got the link for TCS test yesterday?',
      status: 'noise_dropped',
      timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
    {
      id: 'feed-3',
      platform: 'telegram',
      channelName: 'OffCampusJobs4u - 2026 Batch Alerts',
      rawText: 'Microsoft Off-Campus 2026. Role: Full Stack Developer. Location: Hyderabad. Skills: React, Node.js, Express.',
      status: 'council_approved',
      extractedCompany: 'Microsoft',
      extractedRole: 'Full Stack Developer',
      matchScore: 97,
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
  ];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const storedCfg = localStorage.getItem('jobradar_watcher_config_v1');
      if (storedCfg) {
        this.config = JSON.parse(storedCfg);
      }
      const storedFeed = localStorage.getItem('jobradar_radar_feed_v1');
      if (storedFeed) {
        this.feedItems = JSON.parse(storedFeed);
      }
    } catch (e) {
      console.error('Failed to load watcher config from storage:', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('jobradar_watcher_config_v1', JSON.stringify(this.config));
      localStorage.setItem('jobradar_radar_feed_v1', JSON.stringify(this.feedItems.slice(0, 100)));
    } catch (e) {
      console.error('Failed to save watcher config to storage:', e);
    }
  }

  public getConfig(): IWatcherConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<IWatcherConfig>) {
    this.config = { ...this.config, ...updates };
    this.saveToStorage();
  }

  public getFeed(): IRadarFeedItem[] {
    return [...this.feedItems];
  }

  public toggleChannel(channelId: string, enabled: boolean) {
    this.config.monitoredChannels = this.config.monitoredChannels.map((c) =>
      c.id === channelId ? { ...c, enabled } : c
    );
    this.saveToStorage();
  }

  public addChannel(channel: Omit<IChannelSource, 'id' | 'totalCaptured'>) {
    const newChan: IChannelSource = {
      ...channel,
      id: `${channel.platform}-${Date.now()}`,
      totalCaptured: 0,
      lastActiveAt: new Date().toISOString(),
    };
    this.config.monitoredChannels = [newChan, ...this.config.monitoredChannels];
    this.saveToStorage();
    return newChan;
  }

  public removeChannel(channelId: string) {
    this.config.monitoredChannels = this.config.monitoredChannels.filter((c) => c.id !== channelId);
    this.saveToStorage();
  }

  /**
   * Main Autonomous Ingestion Entry Point for WhatsApp & Telegram message streams
   */
  public async ingestIncomingMessage(
    platform: 'whatsapp' | 'telegram' | 'clipboard',
    channelName: string,
    rawText: string
  ): Promise<{ status: string; job?: IJob; feedItem: IRadarFeedItem }> {
    // 1. Triage Filter
    const triage = evaluateNoiseTriage(rawText, channelName);
    const feedId = `feed-${Date.now()}`;

    if (!triage.isJobPosting) {
      const noiseItem: IRadarFeedItem = {
        id: feedId,
        platform,
        channelName,
        rawText,
        status: 'noise_dropped',
        timestamp: new Date().toISOString(),
      };
      this.feedItems = [noiseItem, ...this.feedItems].slice(0, 100);
      this.saveToStorage();
      return { status: 'noise_dropped', feedItem: noiseItem };
    }

    // 2. Feed to Pipeline
    const ingRes = await processIngestion(
      rawText,
      channelName,
      platform === 'clipboard' ? 'manual' : platform
    );
    const primaryJob = ingRes.jobs[0];

    if (!primaryJob) {
      const skipItem: IRadarFeedItem = {
        id: feedId,
        platform,
        channelName,
        rawText,
        status: 'duplicate_skipped',
        timestamp: new Date().toISOString(),
      };
      this.feedItems = [skipItem, ...this.feedItems].slice(0, 100);
      this.saveToStorage();
      return { status: 'duplicate_skipped', feedItem: skipItem };
    }

    // 3. Status determination based on Fit Score
    const isApproved = primaryJob.matchScore >= (this.config.minMatchScoreForToast || 80);
    const feedItem: IRadarFeedItem = {
      id: feedId,
      platform,
      channelName,
      rawText,
      status: isApproved ? 'council_approved' : 'extracted',
      extractedCompany: primaryJob.companyName,
      extractedRole: primaryJob.jobTitle,
      matchScore: primaryJob.matchScore,
      timestamp: new Date().toISOString(),
    };

    // Increment channel captured count
    this.config.monitoredChannels = this.config.monitoredChannels.map((c) =>
      c.name.toLowerCase() === channelName.toLowerCase()
        ? { ...c, totalCaptured: c.totalCaptured + 1, lastActiveAt: new Date().toISOString() }
        : c
    );

    this.feedItems = [feedItem, ...this.feedItems].slice(0, 100);
    this.saveToStorage();

    // 4. Send native desktop notification if high match
    if (isApproved && typeof window !== 'undefined') {
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`🚀 JobRadar: ${primaryJob.companyName} (${primaryJob.matchScore}% Match)`, {
            body: `${primaryJob.jobTitle} • ${primaryJob.location || 'India'}\nCaptured from ${channelName}`,
          });
        }
      } catch (e) {}
    }

    return { status: isApproved ? 'council_approved' : 'extracted', job: primaryJob, feedItem };
  }
}

export const channelManager = new ChannelManagerService();
