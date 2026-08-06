interface QueueEntry<T> {
  key: string;
  priority: number;
  value: T;
}

/** Small deterministic binary min-heap for map searches. */
export class PriorityQueue<T> {
  private readonly entries: QueueEntry<T>[] = [];

  get size(): number {
    return this.entries.length;
  }

  push(key: string, priority: number, value: T): void {
    const entry = { key, priority, value };
    this.entries.push(entry);
    let index = this.entries.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (compare(this.entries[parent], entry) <= 0) break;
      this.entries[index] = this.entries[parent];
      index = parent;
    }
    this.entries[index] = entry;
  }

  pop(): QueueEntry<T> | undefined {
    const first = this.entries[0];
    const last = this.entries.pop();
    if (!first || !last || this.entries.length === 0) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      if (left >= this.entries.length) break;
      const right = left + 1;
      const child = right < this.entries.length
        && compare(this.entries[right], this.entries[left]) < 0 ? right : left;
      if (compare(last, this.entries[child]) <= 0) break;
      this.entries[index] = this.entries[child];
      index = child;
    }
    this.entries[index] = last;
    return first;
  }
}

function compare<T>(a: QueueEntry<T>, b: QueueEntry<T>): number {
  return a.priority - b.priority || a.key.localeCompare(b.key);
}
