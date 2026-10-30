import { EmailItem } from '../types';

export const SAMPLE_SCHEDULED_EMAILS: EmailItem[] = [];

export const SAMPLE_SENT_EMAILS: EmailItem[] = [];

export const INITIAL_COUNTS = {
  scheduled: 0,
  sent: 0,
};

export const SAMPLE_COMPOSE_BODY = `Hi {{firstName}},

I noticed your team has been rapidly expanding outbound motions this quarter. Many B2B teams at this stage run into deliverability bottlenecks and fragmented lead sequencing that slow down rep quota attainment.

We built ReachInbox to automate high-volume personalized scheduling with native deliverability guards and Slack alerting so your pipeline keeps flowing smoothly.

Would you be open to a 10-minute chat next Tuesday to see how we helped similar teams boost reply rates by 34%?`;
