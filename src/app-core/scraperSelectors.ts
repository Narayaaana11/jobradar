/**
 * Centralized DOM Selectors and Diagnostic Configuration for WhatsApp Web and Telegram Web
 * 
 * All CSS selectors used across Electron main process scrapers and client listeners
 * are centralized here to maximize maintainability and resilience against DOM updates.
 */

export interface IPlatformSelectors {
  rootContainer: string[];
  challengeOrLoginIndicators: string[];
  chatListItems: string[];
  chatListTitle: string[];
  chatListPreviewSnippet: string[];
  chatListTimestamp: string[];
  activeConversationHeader: string[];
  activeConversationMessages: string[];
  activeConversationText: string[];
  activeConversationTime: string[];
}

export const SCRAPER_SELECTORS: {
  whatsapp: IPlatformSelectors;
  telegram: IPlatformSelectors;
} = {
  whatsapp: {
    // Verified root containers that prove WhatsApp Web is logged in and showing conversations
    rootContainer: [
      '#pane-side',
      'div[role="listitem"]',
      'div[data-testid="cell-frame-container"]',
      'div[data-testid="chat-list"]',
      'div[data-testid="newsletter-list"]',
      '#app div[tabindex="-1"]',
    ],

    // Elements that indicate the session is logged out, presented with a QR code, or challenged
    challengeOrLoginIndicators: [
      'div[data-testid="qrcode"]',
      'canvas[aria-label="Scan me!"]',
      'canvas[aria-label="Scan this QR code with WhatsApp on your phone"]',
      '.landing-wrapper',
      'div[data-testid="intro-title"]',
      'div[data-testid="landing-title"]',
      'div[data-testid="alert-phone-disconnected"]',
    ],

    // Chat list items in the sidebar
    chatListItems: [
      'div[role="listitem"]',
      'div[data-testid="cell-frame-container"]',
      'div[data-testid="newsletter-list"] > div',
      '#pane-side > div > div > div > div',
      'div._ak72',
      'div._ak8l',
    ],

    // Title / Channel name inside a chat list item
    chatListTitle: [
      'span[data-testid="cell-frame-title"]',
      'span[data-testid="chat-title"]',
      'span[dir="auto"]',
      'span[title]',
      'div._ak8q span',
    ],

    // Preview snippet text inside a chat list item
    chatListPreviewSnippet: [
      'span[title]:not([data-testid="cell-frame-title"])',
      'span.x1rg5ohu',
      'span[data-testid="last-msg-status"] + span',
      'div._ak8k span',
      'div._ak8l span',
      'span._ao3e',
    ],

    // Timestamp element inside a chat list item
    chatListTimestamp: [
      'div[data-testid="cell-frame-meta"] span',
      'div._ak8i',
      'span[dir="auto"]',
    ],

    // Header title of the currently opened conversation pane
    activeConversationHeader: [
      'header span[data-testid="conversation-info-header-chat-title"]',
      'header span[title]',
      'header div[role="button"] span',
    ],

    // Message bubbles in the active conversation pane
    activeConversationMessages: [
      'div.message-in',
      'div.message-out',
      'div[data-testid="msg-container"]',
      'div._amk4',
    ],

    // Message text inside a bubble
    activeConversationText: [
      '.selectable-text',
      'span._ao3e',
      'div.copyable-text',
      'div._akbu span',
    ],

    // Message metadata/timestamp inside a bubble
    activeConversationTime: [
      'span[data-testid="msg-meta"]',
      'div[data-pre-plain-text]',
    ],
  },

  telegram: {
    // Verified root containers that prove Telegram Web is logged in and showing conversations
    rootContainer: [
      '.chatlist',
      '.chat-list',
      '.ListItem',
      '.chatlist-chat',
      '#middle-column',
      '#column-left',
    ],

    // Elements that indicate the session is logged out, asking for phone OTP, QR, or challenged
    challengeOrLoginIndicators: [
      '.login-header',
      'input[type="tel"]',
      '.qr-container',
      '.auth-form',
      '#auth-pages',
      '.login-form',
    ],

    // Chat list items in the sidebar
    chatListItems: [
      '.chatlist-chat',
      '.ListItem',
      '.chat-item',
      'a.chatlist-chat',
    ],

    // Title / Channel name inside a chat list item
    chatListTitle: [
      '.peer-title',
      '.title',
      '.ListItem-title',
      '.chat-title',
      '.dialog-title .peer-title',
    ],

    // Preview snippet text inside a chat list item
    chatListPreviewSnippet: [
      '.subtitle',
      '.dialog-subtitle',
      '.ListItem-subtitle',
      '.last-message',
      '.message',
    ],

    // Timestamp element inside a chat list item
    chatListTimestamp: [
      '.dialog-title-details',
      '.time',
      '.ListItem-meta',
    ],

    // Header title of the currently opened conversation pane
    activeConversationHeader: [
      '.chat-info .title',
      '.topbar .peer-title',
      '.user-caption .dialog-title',
    ],

    // Message bubbles in the active conversation pane
    activeConversationMessages: [
      '.message',
      '.Message',
      '.bubble',
      '.im_message_body',
    ],

    // Message text inside a bubble
    activeConversationText: [
      '.text-content',
      '.message-content',
      '.copyable-area',
      '.im_message_text',
    ],

    // Message metadata/timestamp inside a bubble
    activeConversationTime: [
      '.message-time',
      '.time',
    ],
  },
};

/**
 * Diagnostic logger for selector evaluation
 */
export function formatSelectorDiagnostic(
  platform: 'whatsapp' | 'telegram',
  category: keyof IPlatformSelectors,
  matchedCount: number,
  testedSelectors: string[]
): string {
  if (matchedCount === 0) {
    return `[${platform.toUpperCase()} DOM Warning] Category "${String(category)}" returned 0 results using selectors: [${testedSelectors.join(', ')}]. Possible DOM structure change.`;
  }
  return `[${platform.toUpperCase()} DOM OK] Category "${String(category)}" matched ${matchedCount} elements.`;
}
