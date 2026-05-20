import { db } from "./db";
import {
  sendEmail,
  sendSms,
  buildEventCreatedEmail,
  buildEventUpdatedEmail,
  buildEventDeletedEmail,
  buildSmsMessage,
} from "./notifications";

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

interface EventInfo {
  title: string;
  startAt: Date;
  endAt: Date;
  location?: string | null;
  description?: string | null;
}

/**
 * Notify all users who have access to a calendar (owner + shared users)
 * when an event is created, updated, or deleted.
 * Skips the user who made the change (actorId).
 */
export async function notifyCalendarUsers(
  calendarId: string,
  actorId: string,
  type: "created" | "updated" | "deleted",
  event: EventInfo
) {
  // Get calendar with owner and all shared users
  const calendar = await db.calendar.findUnique({
    where: { id: calendarId },
    include: {
      user: true,
      shares: { include: { user: true } },
    },
  });

  if (!calendar) return;

  const actor = await db.user.findUnique({ where: { id: actorId } });
  if (!actor) return;

  // Build list of recipients (owner + shared users, excluding actor)
  const recipients = [
    calendar.user,
    ...calendar.shares.map((s) => s.user),
  ].filter((u) => u.id !== actorId);

  if (recipients.length === 0) return;

  // Send notifications in parallel (fire and forget)
  await Promise.allSettled(
    recipients.map(async (recipient) => {
      // Email notification
      if (recipient.notifyEmail) {
        let emailContent: { subject: string; html: string };

        if (type === "created") {
          emailContent = buildEventCreatedEmail({
            recipientName: recipient.name,
            eventTitle: event.title,
            calendarName: calendar.name,
            startAt: event.startAt,
            endAt: event.endAt,
            location: event.location,
            description: event.description,
            sharedByName: actor.name,
            appUrl: APP_URL,
          });
        } else if (type === "updated") {
          emailContent = buildEventUpdatedEmail({
            recipientName: recipient.name,
            eventTitle: event.title,
            calendarName: calendar.name,
            startAt: event.startAt,
            endAt: event.endAt,
            location: event.location,
            updatedByName: actor.name,
            appUrl: APP_URL,
          });
        } else {
          emailContent = buildEventDeletedEmail({
            recipientName: recipient.name,
            eventTitle: event.title,
            calendarName: calendar.name,
            deletedByName: actor.name,
            appUrl: APP_URL,
          });
        }

        await sendEmail({ to: recipient.email, ...emailContent });
      }

      // SMS notification
      if (recipient.notifySms && recipient.phone) {
        const message = buildSmsMessage(type, {
          eventTitle: event.title,
          calendarName: calendar.name,
          startAt: event.startAt,
          endAt: event.endAt,
          location: event.location,
          byName: actor.name,
        });
        await sendSms({ to: recipient.phone, message });
      }
    })
  );
}
