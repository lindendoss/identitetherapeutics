import fs from "fs";
import path from "path";

const DATA_DIR = "./data";

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readFile<T>(name: string): T[] {
  ensureDir();
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

export function writeFile<T>(name: string, data: T[]) {
  ensureDir();
  fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2));
}

let idCounters: Record<string, number> = {};

function nextId(table: string): number {
  if (!idCounters[table]) {
    const rows = readFile(table);
    idCounters[table] = rows.length > 0 ? Math.max(...rows.map((r: any) => r.id || 0)) + 1 : 1;
  }
  return idCounters[table]++;
}

export function insert<T extends Record<string, any>>(table: string, row: Omit<T, "id" | "createdAt">): T {
  const rows = readFile<T>(table);
  const newRow = {
    ...row,
    id: nextId(table),
    createdAt: new Date().toISOString(),
  } as T;
  rows.push(newRow);
  writeFile(table, rows);
  return newRow;
}

export function select<T>(table: string): T[] {
  return readFile<T>(table);
}

export function selectWhere<T>(table: string, field: string, value: any): T[] {
  return readFile<T>(table).filter((r: any) => r[field] === value);
}

export function deleteWhere(table: string, field: string, value: any) {
  const rows = readFile(table).filter((r: any) => r[field] !== value);
  writeFile(table, rows);
}
