import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Medicine, NewMedicineInput } from "./medicineTypes";
import { getPool, hasDatabase } from "./db";
import { validateSellAgainstStock } from "./validation/medicine";

const DB_FILE = path.join(process.cwd(), "src", "data", "medicines.json");

async function ensureDbFileExists() {
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify({ items: [] }, null, 2), "utf8");
  }
}

type DbShape = { items: Medicine[] };

async function readDb(): Promise<DbShape> {
  await ensureDbFileExists();
  const raw = await fs.readFile(DB_FILE, "utf8");
  const parsed = JSON.parse(raw) as DbShape;
  if (!parsed || !Array.isArray(parsed.items)) return { items: [] };
  return parsed;
}

async function writeDb(db: DbShape) {
  await ensureDbFileExists();
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function rowToMedicine(row: Record<string, unknown>): Medicine {
  const price = typeof row.price === "string" ? Number(row.price) : Number(row.price);
  return {
    id: String(row.id),
    name: String(row.name),
    batchNumber: String(row.batchnumber ?? row.batchNumber),
    expiryDate: String(row.expirydate ?? row.expiryDate),
    quantity: Number(row.quantity),
    price,
    createdAt:
      row.createdat instanceof Date
        ? row.createdat.toISOString()
        : String(row.createdat ?? row.createdAt),
  };
}

export async function getAllMedicines(): Promise<Medicine[]> {
  if (hasDatabase()) {
    const pool = getPool();
    const result = await pool.query(
      `select id, name, batch_number as "batchNumber",
              to_char(expiry_date, 'YYYY-MM-DD') as "expiryDate",
              quantity, price, created_at as "createdAt"
       from medicines
       order by created_at desc`,
    );
    return result.rows.map((r) => rowToMedicine(r as Record<string, unknown>));
  }

  const db = await readDb();
  return db.items;
}

export async function addMedicine(input: NewMedicineInput): Promise<Medicine> {
  if (hasDatabase()) {
    const pool = getPool();
    const id = randomUUID();
    const createdBy = input.createdByUserId ?? null;
    const result = await pool.query(
      `insert into medicines (id, name, batch_number, expiry_date, quantity, price, created_by)
       values ($1, $2, $3, $4::date, $5, $6, $7)
       returning id, name, batch_number as "batchNumber",
                 to_char(expiry_date, 'YYYY-MM-DD') as "expiryDate",
                 quantity, price, created_at as "createdAt"`,
      [id, input.name, input.batchNumber, input.expiryDate, input.quantity, input.price, createdBy],
    );
    return rowToMedicine(result.rows[0] as Record<string, unknown>);
  }

  const db = await readDb();
  const medicine: Medicine = {
    id: randomUUID(),
    name: input.name.trim(),
    batchNumber: input.batchNumber.trim(),
    expiryDate: input.expiryDate,
    quantity: input.quantity,
    price: input.price,
    createdAt: new Date().toISOString(),
  };
  db.items.unshift(medicine);
  await writeDb(db);
  return medicine;
}

export async function sellMedicine(id: string, amount: number): Promise<Medicine> {
  if (hasDatabase()) {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("begin");
      const sel = await client.query(
        `select id, name, batch_number as "batchNumber",
                to_char(expiry_date, 'YYYY-MM-DD') as "expiryDate",
                quantity, price, created_at as "createdAt"
         from medicines where id = $1 for update`,
        [id],
      );
      if (sel.rows.length === 0) {
        await client.query("rollback");
        throw new Error("Medicine not found.");
      }
      const med = rowToMedicine(sel.rows[0] as Record<string, unknown>);
      const check = validateSellAgainstStock(med.quantity, amount);
      if (!check.ok) {
        await client.query("rollback");
        throw new Error(check.error);
      }
      const upd = await client.query(
        `update medicines set quantity = quantity - $2 where id = $1
         returning id, name, batch_number as "batchNumber",
                   to_char(expiry_date, 'YYYY-MM-DD') as "expiryDate",
                   quantity, price, created_at as "createdAt"`,
        [id, amount],
      );
      await client.query("commit");
      return rowToMedicine(upd.rows[0] as Record<string, unknown>);
    } catch (e) {
      try {
        await client.query("rollback");
      } catch {
        /* ignore */
      }
      throw e;
    } finally {
      client.release();
    }
  }

  const db = await readDb();
  const idx = db.items.findIndex((m) => m.id === id);
  if (idx === -1) throw new Error("Medicine not found.");

  const med = db.items[idx];
  const check = validateSellAgainstStock(med.quantity, amount);
  if (!check.ok) throw new Error(check.error);

  const updated: Medicine = { ...med, quantity: med.quantity - amount };
  db.items[idx] = updated;
  await writeDb(db);
  return updated;
}
