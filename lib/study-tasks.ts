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
