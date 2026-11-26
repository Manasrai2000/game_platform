import { eq, and, gt, desc } from "drizzle-orm";
import { db } from "../../core/database/connection";
import {
  users,
  classes,
  class_activities,
  student_journey_progress,
  subscriptions,
  plans,
  referrals,
  activity_tracking_events,
} from "../../core/database/schema/index";

export class TrackingService {
  /**
   * Validates user, device status, active subscription, demo status, and activity progress.
   */
  async getUserActivityStatus(userId: number, classGrade: string | null) {
    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRecord) {
      return null;
    }

    const now = new Date();

    // 1. Check active subscription
    const activeSubs = await db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        startsAt: subscriptions.starts_at,
        expiresAt: subscriptions.expires_at,
        planTitle: plans.title,
        planCode: plans.code,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.plan_id, plans.id))
      .where(
        and(
          eq(subscriptions.user_id, userId),
          eq(subscriptions.status, "ACTIVE"),
          gt(subscriptions.expires_at, now)
        )
      )
      .orderBy(desc(subscriptions.expires_at))
      .limit(1);

    const activeSubscription = activeSubs.length > 0 ? activeSubs[0] : null;
    const hasActiveSubscription = Boolean(activeSubscription);

    // 2. Find student's class & activity package
    const allClasses = await db.select().from(classes);
    const matchedClass = classGrade
      ? allClasses.find(
          (c) => c.name.toLowerCase().trim() === classGrade.toLowerCase().trim()
        )
      : null;

    let activitySummary: {
      classId: number;
      title: string;
      totalCheckpoints: number;
      demoCheckpoints: number;
      currentCheckpoint: number;
      maxCompletedCheckpoint: number;
      isDemoCompleted: boolean;
      canProceed: boolean;
      lockReason: "SUBSCRIPTION_REQUIRED" | null;
    } | null = null;

    if (matchedClass) {
      const [activity] = await db
        .select()
        .from(class_activities)
        .where(
          and(
            eq(class_activities.class_id, matchedClass.id),
            eq(class_activities.is_active, true)
          )
        )
        .limit(1);

      if (activity) {
        const [progress] = await db
          .select()
          .from(student_journey_progress)
          .where(
            and(
              eq(student_journey_progress.user_id, userId),
              eq(student_journey_progress.class_id, matchedClass.id)
            )
          )
          .limit(1);

        const maxCompleted = progress ? progress.max_completed_checkpoint : 0;
        const currentCp = progress ? progress.current_checkpoint : 1;
        const demoLimit = activity.demo_checkpoints_count || 1;
        const isDemoCompleted = maxCompleted >= demoLimit;
        const canProceed = hasActiveSubscription || currentCp <= demoLimit;

        activitySummary = {
          classId: matchedClass.id,
          title: activity.title,
          totalCheckpoints: activity.total_checkpoints,
          demoCheckpoints: demoLimit,
          currentCheckpoint: currentCp,
          maxCompletedCheckpoint: maxCompleted,
          isDemoCompleted,
          canProceed,
          lockReason: canProceed ? null : "SUBSCRIPTION_REQUIRED",
        };
      }
    }

    // 3. Referral stats
    const userReferrals = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrer_id, userId));

    const totalConverted = userReferrals.filter((r) => r.status === "REWARDED").length;

    return {
      user: {
        id: userRecord.id,
        fullName: userRecord.full_name,
        classGrade: userRecord.class_grade,
        myReferralCode: userRecord.referral_code,
      },
      access: {
        isDeviceLocked: true,
        isDesktop: true,
        hasActiveSubscription,
        subscription: activeSubscription,
      },
      activity: activitySummary,
      referralStats: {
        totalInvited: userReferrals.length,
        totalConverted,
        rewardWalletBalance: userRecord.reward_wallet_balance,
      },
    };
  }

  /**
   * Logs funnel & progression events for tracking analytics.
   */
  async trackEvent(
    userId: number,
    classId: number | null,
    eventType: string,
    eventMetadata?: Record<string, unknown>
  ): Promise<void> {
    await db.insert(activity_tracking_events).values({
      user_id: userId,
      class_id: classId,
      event_type: eventType,
      event_metadata: eventMetadata ? JSON.stringify(eventMetadata) : null,
    });
  }
}

export const trackingService = new TrackingService();
