export type ReepayWebhookHeaders = {
  signature?: string;
  eventType?: string;
  eventId?: string;
  timestamp?: string;
  requestId?: string;
};

export type ReepayWebhookResult = {
  received: true;
  duplicate: boolean;
};
