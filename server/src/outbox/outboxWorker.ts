import type { Db } from '../db.js';
import { transaction } from '../db.js';
import { operationalMetrics } from '../operations/metrics.js';

export interface OutboxMessage { id: string; eventType: string; aggregateType: string; aggregateId: string; payload: unknown; deduplicationKey: string }
export interface OutboxPublisher { publish(message: OutboxMessage): Promise<void> }

export class InternalOutboxPublisher implements OutboxPublisher {
  async publish(_message: OutboxMessage): Promise<void> {}
}

export class OutboxWorker {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;

  constructor(private readonly db: Db, private readonly publisher: OutboxPublisher, private readonly pollMs = 1000, private readonly canClaim:()=>Promise<boolean>=async()=>true) {}

  async runOnce(): Promise<boolean> {
    if(!await this.canClaim()) return false;
    const event = await transaction(this.db, async (client) => {
      const result = await client.query(
        `SELECT * FROM outbox_events
         WHERE (status='PENDING' OR (status='PROCESSING' AND locked_at < now()-interval '5 minutes')) AND available_at<=now()
         ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`,
      );
      if (!result.rowCount) return null;
      const row = result.rows[0];
      await client.query(`UPDATE outbox_events SET status='PROCESSING',locked_at=now(),attempt_count=attempt_count+1 WHERE id=$1`, [row.id]);
      return row;
    });
    if (!event) return false;
    operationalMetrics.increment('worker_jobs_total',{worker:'outbox',outcome:'claimed'});
    try {
      await this.publisher.publish({ id: event.id, eventType: event.event_type, aggregateType: event.aggregate_type, aggregateId: event.aggregate_id, payload: event.payload, deduplicationKey: event.deduplication_key });
      await this.db.query(`UPDATE outbox_events SET status='PUBLISHED',published_at=now(),locked_at=NULL,last_error=NULL WHERE id=$1 AND status='PROCESSING'`, [event.id]);
      operationalMetrics.increment('worker_jobs_total',{worker:'outbox',outcome:'succeeded'});
    } catch (error) {
      const safeError = error instanceof Error ? error.message.slice(0, 300) : 'Publisher failed';
      await this.db.query(
        `UPDATE outbox_events SET status=CASE WHEN attempt_count>=max_attempts THEN 'FAILED' ELSE 'PENDING' END,
         available_at=now()+(LEAST(300,power(2,attempt_count)) || ' seconds')::interval,locked_at=NULL,last_error=$2
         WHERE id=$1 AND status='PROCESSING'`,
        [event.id, safeError],
      );
      operationalMetrics.increment('worker_jobs_total',{worker:'outbox',outcome:Number(event.attempt_count)+1>=Number(event.max_attempts)?'terminal':'retry'});
    }
    return true;
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    const tick = async () => {
      if (this.stopped) return;
      try { await this.runOnce(); } finally { if (!this.stopped) this.timer = setTimeout(tick, this.pollMs); }
    };
    void tick();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
