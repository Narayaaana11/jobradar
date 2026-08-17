export interface IJobNotification {
  id: string;
  jobId: string;
  companyName: string;
  jobTitle: string;
  matchScore: number;
  message: string;
  type: 'high_match' | 'system' | 'new_job';
  createdAt: string;
}

export class NotificationService {
  private notifications: IJobNotification[] = [];

  public checkAndNotifyHighMatch(jobItem: any): IJobNotification | null {
    if (jobItem.matchScore >= 80) {
      const notification: IJobNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        jobId: jobItem.id,
        companyName: jobItem.companyName,
        jobTitle: jobItem.jobTitle,
        matchScore: jobItem.matchScore,
        message: `🔥 HIGH FIT ALERT: ${jobItem.companyName} is hiring for ${jobItem.jobTitle} (${jobItem.matchScore}% Match)!`,
        type: 'high_match',
        createdAt: new Date().toISOString(),
      };

      this.notifications.unshift(notification);
      console.log(`[NotificationService] ${notification.message}`);
      return notification;
    }
    return null;
  }

  public getNotifications(): IJobNotification[] {
    return this.notifications;
  }
}

export const notificationService = new NotificationService();
