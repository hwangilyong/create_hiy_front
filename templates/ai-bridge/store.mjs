import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

const DB_DIRECTORY = ".hiy-ai-review";
const DB_FILENAME = "ai-review.db";

function json(value, fallback = null) {
  if (value === undefined) return fallback === null ? null : JSON.stringify(fallback);
  return value === null ? null : JSON.stringify(value);
}

function parseJson(value, fallback = null) {
  if (typeof value !== "string" || value === "") return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

export function createStore(projectRoot) {
  const directory = path.join(projectRoot, DB_DIRECTORY);
  mkdirSync(directory, { recursive: true });
  const databasePath = path.join(directory, DB_FILENAME);
  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_job (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL,
      status TEXT NOT NULL,
      queue_position INTEGER NOT NULL DEFAULT 0,
      project_root TEXT NOT NULL,
      target_file TEXT NOT NULL,
      absolute_target_file TEXT NOT NULL,
      prompt TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      history_id TEXT,
      error TEXT,
      lock_owner_job_id TEXT,
      cache_cleared_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE INDEX IF NOT EXISTS idx_ai_job_story_status
      ON ai_job(project_root, story_id, status, created_at);

    CREATE TABLE IF NOT EXISTS ai_job_target (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      absolute_file_path TEXT NOT NULL,
      lock_status TEXT NOT NULL DEFAULT 'pending',
      UNIQUE(job_id, absolute_file_path),
      FOREIGN KEY(job_id) REFERENCES ai_job(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ai_job_target_job ON ai_job_target(job_id);

    CREATE TABLE IF NOT EXISTS ai_job_comment (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      comment_id TEXT,
      story_id TEXT NOT NULL,
      comment TEXT NOT NULL,
      target_id TEXT,
      selector TEXT,
      line_number INTEGER,
      target_json TEXT NOT NULL,
      created_at TEXT,
      FOREIGN KEY(job_id) REFERENCES ai_job(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ai_job_comment_job ON ai_job_comment(job_id);

    CREATE TABLE IF NOT EXISTS ai_file_lock (
      file_path TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      locked_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_history (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      created_at TEXT NOT NULL,
      project_root TEXT NOT NULL,
      story_id TEXT NOT NULL,
      target_file TEXT NOT NULL,
      absolute_target_file TEXT NOT NULL,
      status TEXT NOT NULL,
      prompt TEXT NOT NULL,
      comments_json TEXT NOT NULL,
      before_content TEXT,
      after_content TEXT,
      result_json TEXT,
      cache_cleared_json TEXT NOT NULL DEFAULT '[]',
      rolled_back_at TEXT,
      rollback_forced INTEGER NOT NULL DEFAULT 0,
      rollback_cache_cleared_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE INDEX IF NOT EXISTS idx_ai_history_created ON ai_history(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_history_job ON ai_history(job_id);

    CREATE TABLE IF NOT EXISTS review_comment (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL,
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL,
      target_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_review_comment_story ON review_comment(story_id, created_at);
  `);

  const recover = db.transaction(() => {
    db.prepare("DELETE FROM ai_file_lock").run();
    db.prepare(`UPDATE ai_job
      SET status = 'queued', started_at = NULL, completed_at = NULL,
          error = 'Bridge restarted while this job was running; queued for retry',
          lock_owner_job_id = NULL
      WHERE status = 'running'`).run();
  });
  recover();

  const insertJobStmt = db.prepare(`INSERT INTO ai_job (
    id, story_id, status, queue_position, project_root, target_file,
    absolute_target_file, prompt, payload_json, created_at
  ) VALUES (?, ?, 'queued', 0, ?, ?, ?, ?, ?, ?)`);
  const insertTargetStmt = db.prepare(`INSERT INTO ai_job_target
    (id, job_id, file_path, absolute_file_path, lock_status)
    VALUES (?, ?, ?, ?, 'pending')`);
  const insertCommentStmt = db.prepare(`INSERT INTO ai_job_comment
    (id, job_id, comment_id, story_id, comment, target_id, selector, line_number, target_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  function insertJob(job, randomId) {
    const tx = db.transaction(() => {
      insertJobStmt.run(
        job.id,
        job.payload.storyId,
        job.payload.projectRoot,
        job.payload.targetFile,
        job.payload.absoluteTargetFile,
        job.prompt,
        JSON.stringify(job.payload),
        job.createdAt,
      );
      insertTargetStmt.run(randomId(), job.id, job.payload.targetFile, job.payload.absoluteTargetFile);
      for (const comment of job.payload.comments) {
        insertCommentStmt.run(
          randomId(), job.id, comment.id, comment.storyId, comment.comment,
          comment.target?.selector ?? null,
          comment.target?.selector ?? null,
          comment.target?.lineNumber ?? null,
          JSON.stringify(comment.target ?? {}),
          comment.createdAt ?? null,
        );
      }
    });
    tx();
  }

  function rowToJob(row) {
    if (!row) return null;
    return {
      id: row.id,
      storyId: row.story_id,
      targetFile: row.target_file,
      status: row.status,
      queuePosition: row.queue_position,
      projectRoot: row.project_root,
      absoluteTargetFile: row.absolute_target_file,
      prompt: row.prompt,
      payload: parseJson(row.payload_json, {}),
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      historyId: row.history_id,
      error: row.error,
      lockOwnerJobId: row.lock_owner_job_id,
      cacheCleared: parseJson(row.cache_cleared_json, []),
    };
  }

  function getJob(id) {
    return rowToJob(db.prepare("SELECT * FROM ai_job WHERE id = ?").get(id));
  }

  function updateJob(id, patch) {
    const columns = {
      status: "status",
      queuePosition: "queue_position",
      startedAt: "started_at",
      completedAt: "completed_at",
      historyId: "history_id",
      error: "error",
      lockOwnerJobId: "lock_owner_job_id",
    };
    const sets = [];
    const values = [];
    for (const [key, column] of Object.entries(columns)) {
      if (Object.hasOwn(patch, key)) { sets.push(`${column} = ?`); values.push(patch[key]); }
    }
    if (Object.hasOwn(patch, "cacheCleared")) {
      sets.push("cache_cleared_json = ?");
      values.push(json(patch.cacheCleared, []));
    }
    if (sets.length === 0) return getJob(id);
    values.push(id);
    db.prepare(`UPDATE ai_job SET ${sets.join(", ")} WHERE id = ?`).run(...values);
    return getJob(id);
  }

  function listJobs({ activeOnly = false } = {}) {
    const sql = activeOnly
      ? `SELECT * FROM ai_job WHERE status IN ('queued','running','blocked') ORDER BY created_at ASC`
      : `SELECT * FROM ai_job ORDER BY created_at DESC LIMIT 200`;
    return db.prepare(sql).all().map(rowToJob);
  }

  function listQueuedStories() {
    return db.prepare(`SELECT project_root, story_id, MIN(created_at) AS first_created_at
      FROM ai_job WHERE status = 'queued'
      GROUP BY project_root, story_id
      ORDER BY first_created_at`).all();
  }

  function listQueuedJobs(projectRoot, storyId) {
    return db.prepare(`SELECT * FROM ai_job
      WHERE project_root = ? AND story_id = ? AND status = 'queued'
      ORDER BY created_at ASC`).all(projectRoot, storyId).map(rowToJob);
  }

  function refreshQueuePositions(projectRoot, storyId, running) {
    const queued = listQueuedJobs(projectRoot, storyId);
    const tx = db.transaction(() => {
      queued.forEach((job, index) => {
        db.prepare("UPDATE ai_job SET queue_position = ? WHERE id = ?").run(index + (running ? 1 : 0), job.id);
      });
    });
    tx();
  }

  function acquireLock(filePath, ownerId, lockedAt) {
    const tx = db.transaction(() => {
      const owner = db.prepare("SELECT job_id FROM ai_file_lock WHERE file_path = ?").get(filePath);
      if (owner && owner.job_id !== ownerId) return { acquired: false, owner: owner.job_id };
      db.prepare(`INSERT INTO ai_file_lock(file_path, job_id, locked_at)
        VALUES (?, ?, ?)
        ON CONFLICT(file_path) DO UPDATE SET job_id = excluded.job_id, locked_at = excluded.locked_at`).run(filePath, ownerId, lockedAt);
      db.prepare("UPDATE ai_job_target SET lock_status = 'locked' WHERE job_id = ? AND absolute_file_path = ?").run(ownerId, filePath);
      return { acquired: true, owner: ownerId };
    });
    return tx();
  }

  function releaseLock(filePath, ownerId) {
    const tx = db.transaction(() => {
      db.prepare("DELETE FROM ai_file_lock WHERE file_path = ? AND job_id = ?").run(filePath, ownerId);
      db.prepare("UPDATE ai_job_target SET lock_status = 'released' WHERE job_id = ? AND absolute_file_path = ?").run(ownerId, filePath);
    });
    tx();
  }

  function listLocks() {
    return db.prepare("SELECT file_path AS targetFile, job_id AS jobId, locked_at AS lockedAt FROM ai_file_lock ORDER BY locked_at").all();
  }

  function deleteJob(id) {
    const job = getJob(id);
    if (!job) return null;
    if (!['queued', 'blocked'].includes(job.status)) return { conflict: true, job };
    db.prepare("DELETE FROM ai_job WHERE id = ?").run(id);
    return { deleted: true, job };
  }

  function saveHistory(entry) {
    db.prepare(`INSERT INTO ai_history (
      id, job_id, created_at, project_root, story_id, target_file, absolute_target_file,
      status, prompt, comments_json, before_content, after_content, result_json,
      cache_cleared_json, rolled_back_at, rollback_forced, rollback_cache_cleared_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      before_content = excluded.before_content,
      after_content = excluded.after_content,
      result_json = excluded.result_json,
      cache_cleared_json = excluded.cache_cleared_json,
      rolled_back_at = excluded.rolled_back_at,
      rollback_forced = excluded.rollback_forced,
      rollback_cache_cleared_json = excluded.rollback_cache_cleared_json`).run(
      entry.id,
      entry.jobId ?? null,
      entry.createdAt,
      entry.projectRoot,
      entry.storyId,
      entry.targetFile,
      entry.absoluteTargetFile,
      entry.status,
      entry.prompt,
      json(entry.comments, []),
      entry.beforeContent ?? null,
      entry.afterContent ?? null,
      json(entry.result),
      json(entry.cacheCleared, []),
      entry.rolledBackAt ?? null,
      entry.rollbackForced ? 1 : 0,
      json(entry.rollbackCacheCleared, []),
    );
  }

  function rowToHistory(row) {
    if (!row) return null;
    return {
      id: row.id,
      jobId: row.job_id,
      createdAt: row.created_at,
      projectRoot: row.project_root,
      storyId: row.story_id,
      targetFile: row.target_file,
      absoluteTargetFile: row.absolute_target_file,
      status: row.status,
      prompt: row.prompt,
      comments: parseJson(row.comments_json, []),
      beforeContent: row.before_content,
      afterContent: row.after_content,
      result: parseJson(row.result_json),
      cacheCleared: parseJson(row.cache_cleared_json, []),
      rolledBackAt: row.rolled_back_at,
      rollbackForced: Boolean(row.rollback_forced),
      rollbackCacheCleared: parseJson(row.rollback_cache_cleared_json, []),
    };
  }

  function getHistory(id) {
    return rowToHistory(db.prepare("SELECT * FROM ai_history WHERE id = ?").get(id));
  }

  function listHistory() {
    return db.prepare("SELECT * FROM ai_history ORDER BY created_at DESC LIMIT 200").all().map(rowToHistory);
  }

  function upsertComment(comment) {
    db.prepare(`INSERT INTO review_comment(id, story_id, comment, created_at, target_json)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET story_id = excluded.story_id, comment = excluded.comment,
      created_at = excluded.created_at, target_json = excluded.target_json`).run(
      comment.id, comment.storyId, comment.comment, comment.createdAt, JSON.stringify(comment.target ?? {}),
    );
  }

  function listComments(storyId = null) {
    const rows = storyId
      ? db.prepare("SELECT * FROM review_comment WHERE story_id = ? ORDER BY created_at").all(storyId)
      : db.prepare("SELECT * FROM review_comment ORDER BY created_at").all();
    return rows.map((row) => ({
      id: row.id,
      storyId: row.story_id,
      comment: row.comment,
      createdAt: row.created_at,
      target: parseJson(row.target_json, {}),
    }));
  }

  function deleteComment(id) {
    return db.prepare("DELETE FROM review_comment WHERE id = ?").run(id).changes > 0;
  }

  function close() { db.close(); }

  return {
    databasePath,
    insertJob,
    getJob,
    updateJob,
    listJobs,
    listQueuedStories,
    listQueuedJobs,
    refreshQueuePositions,
    acquireLock,
    releaseLock,
    listLocks,
    deleteJob,
    saveHistory,
    getHistory,
    listHistory,
    upsertComment,
    listComments,
    deleteComment,
    close,
  };
}
