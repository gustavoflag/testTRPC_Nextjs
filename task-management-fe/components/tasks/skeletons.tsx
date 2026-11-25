const bar = "animate-pulse rounded-lg bg-black/5 dark:bg-white/10";

export function TaskListSkeleton() {
  return (
    <ul aria-busy="true" aria-label="Loading tasks" className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <li key={i} className={`h-16 ${bar}`} />
      ))}
    </ul>
  );
}

export function TaskSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading task" className="flex flex-col gap-3">
      <div className={`h-9 w-2/3 ${bar}`} />
      <div className={`h-20 ${bar}`} />
    </div>
  );
}
