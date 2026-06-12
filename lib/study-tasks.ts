import { prisma } from "@/lib/db";

export interface TaskItem {
  title?: unknown;
  brief?: unknown;
  steps?: unknown;
  type?: unknown;
  priority?: unknown;
  dueDate?: unknown;
}

const TASK_TYPES = ["essay", "study", "exam", "reading", "other"];
const PRIORITIES = ["low", "medium", "high"];

const taskInclude = {
  drafts: { select: { id: true, title: true, status: true, wordCount: true, updatedAt: true } },
} as const;

/**
 * Create StudyTask rows from a loosely-typed array of items (as produced by the
 * AI). Shared by the planner "breakdown" endpoint and the tutor chat so the
 * tutor can create activities directly from the conversation.
 */
export async function createTasksFromItems(projectId: string, items: TaskItem[]) {
  const baseOrder = await prisma.studyTask.count({ where: { projectId } });
  const created = [];
  let i = 0;
  for (const raw of items) {
    const it = raw || {};
    const title = (it.title ?? "").toString().trim();
    if (!title) continue;
    let due: Date | null = null;
    if (it.dueDate && it.dueDate !== "null") {
      const d = new Date(it.dueDate.toString());
      if (!isNaN(d.getTime())) due = d;
    }
    const type = TASK_TYPES.includes(it.type as string) ? (it.type as string) : "essay";
    const priority = PRIORITIES.includes(it.priority as string) ? (it.priority as string) : "medium";
    const task = await prisma.studyTask.create({
      data: {
        projectId,
        title: title.slice(0, 200),
        brief: it.brief ? it.brief.toString() : null,
        steps: it.steps ? it.steps.toString() : null,
        type,
        priority,
        status: "todo",
        dueDate: due,
        order: baseOrder + i,
      },
      include: taskInclude,
    });
    created.push(task);
    i++;
  }
  return created;
}

/** Tolerant parse of a JSON array of task items from an AI reply. */
export function parseTaskItems(block: string): TaskItem[] {
  try {
    const start = block.indexOf("[");
    const end = block.lastIndexOf("]");
    if (start === -1 || end === -1) return [];
    const arr = JSON.parse(block.slice(start, end + 1));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

const STATUSES = ["todo", "in_progress", "to_deliver", "done"];

export interface TaskUpdateItem {
  id?: unknown;
  title?: unknown; // used to match when no id is given
  newTitle?: unknown;
  status?: unknown;
  priority?: unknown;
  type?: unknown;
  dueDate?: unknown;
  brief?: unknown;
  steps?: unknown;
}

function normaliseTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Apply a set of updates to EXISTING activities. Each update is matched to a
 * task by id first, then by a fuzzy title match. Only the provided fields are
 * changed. Returns the updated task rows.
 */
export async function applyTaskUpdates(projectId: string, updates: TaskUpdateItem[]) {
  if (updates.length === 0) return [];
  const tasks = await prisma.studyTask.findMany({ where: { projectId } });
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const updatedIds = new Set<string>();

  for (const raw of updates) {
    const u = raw || {};
    let target = u.id ? byId.get(u.id.toString()) : undefined;
    if (!target && u.title) {
      const want = normaliseTitle(u.title.toString());
      target =
        tasks.find((t) => normaliseTitle(t.title) === want) ||
        tasks.find((t) => normaliseTitle(t.title).includes(want) || want.includes(normaliseTitle(t.title)));
    }
    if (!target) continue;

    const data: Record<string, unknown> = {};
    if (typeof u.newTitle === "string" && u.newTitle.trim()) data.title = u.newTitle.trim().slice(0, 200);
    if (STATUSES.includes(u.status as string)) data.status = u.status;
    if (PRIORITIES.includes(u.priority as string)) data.priority = u.priority;
    if (TASK_TYPES.includes(u.type as string)) data.type = u.type;
    if (typeof u.brief === "string") data.brief = u.brief;
    if (typeof u.steps === "string") data.steps = u.steps;
    if (u.dueDate !== undefined) {
      if (u.dueDate === null || u.dueDate === "null" || u.dueDate === "") {
        data.dueDate = null;
      } else {
        const d = new Date(u.dueDate.toString());
        if (!isNaN(d.getTime())) data.dueDate = d;
      }
    }
    if (Object.keys(data).length === 0) continue;

    await prisma.studyTask.update({ where: { id: target.id }, data });
    updatedIds.add(target.id);
  }

  if (updatedIds.size === 0) return [];
  return prisma.studyTask.findMany({
    where: { id: { in: Array.from(updatedIds) } },
    include: taskInclude,
  });
}

/** Tolerant parse of a JSON array of task-update items from an AI reply. */
export function parseTaskUpdates(block: string): TaskUpdateItem[] {
  try {
    const start = block.indexOf("[");
    const end = block.lastIndexOf("]");
    if (start === -1 || end === -1) return [];
    const arr = JSON.parse(block.slice(start, end + 1));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
