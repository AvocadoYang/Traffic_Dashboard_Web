/**
 * 二元堆積 (最小的先出來). 時間一樣時照放進去的順序, 結果才會每次一樣.
 */
export class MinHeap<T> {
  private keys: number[] = [];
  private seqs: number[] = [];
  private items: T[] = [];
  private seq = 0;

  get size() {
    return this.items.length;
  }

  peekKey(): number {
    return this.items.length ? this.keys[0] : Infinity;
  }

  push(key: number, item: T) {
    this.keys.push(key);
    this.seqs.push(this.seq++);
    this.items.push(item);
    this.up(this.items.length - 1);
  }

  pop(): T | undefined {
    const n = this.items.length;
    if (!n) return undefined;
    const top = this.items[0];
    this.swap(0, n - 1);
    this.keys.pop();
    this.seqs.pop();
    this.items.pop();
    if (n > 1) this.down(0);
    return top;
  }

  private less(i: number, j: number) {
    return this.keys[i] < this.keys[j] || (this.keys[i] === this.keys[j] && this.seqs[i] < this.seqs[j]);
  }

  private swap(i: number, j: number) {
    [this.keys[i], this.keys[j]] = [this.keys[j], this.keys[i]];
    [this.seqs[i], this.seqs[j]] = [this.seqs[j], this.seqs[i]];
    [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
  }

  private up(i: number) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      this.swap(i, p);
      i = p;
    }
  }

  private down(i: number) {
    const n = this.items.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < n && this.less(l, m)) m = l;
      if (r < n && this.less(r, m)) m = r;
      if (m === i) break;
      this.swap(i, m);
      i = m;
    }
  }
}
