// server/index.js (versione credenziali-da-UI)
import express from 'express';
import cors from 'cors';
import pkg from 'pg';

const { Pool } = pkg;
const app = express();
app.use(express.json());

// CORS: consenti la tua UI (puoi rendere più restrittivo)
app.use(cors({ origin: true }));

// valida identificatori
const safe = s => typeof s === 'string' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s);

// crea una pool effimera per richiesta (oppure cache per 60s per sessione)
function makePool(conn) {
  const { host, port, database, user, password, ssl } = conn || {};
  if (!host || !database || !user) throw new Error('Credenziali incomplete');
  return new Pool({
    host, port: +(port || 5432), database, user, password,
    ssl: !!ssl,
    max: 3, idleTimeoutMillis: 10_000
  });
}

// Schemi + Tabelle (limitati a schemi “normali”)
app.post('/pg/info2', async (req, res, next) => {
  const pool = makePool(req.body?.conn);
  try {
    const { rows: schemas } = await pool.query(
      `select schema_name
       from information_schema.schemata
       where schema_name not like 'pg\\_%' escape '\\'
         and schema_name <> 'information_schema'
       order by schema_name`
    );
    const { rows: tables } = await pool.query(
      `select table_schema, table_name
       from information_schema.tables
       where table_type='BASE TABLE'
         and table_schema not like 'pg\\_%' escape '\\'
         and table_schema <> 'information_schema'
       order by table_schema, table_name`
    );
    res.json({ schemas: schemas.map(r => r.schema_name), tables });
  } catch(e){ next(e); }
  finally { pool.end().catch(()=>{}); }
});

// Dati
app.post('/pg/data2', async (req, res, next) => {
  const pool = makePool(req.body?.conn);
  try {
    const { schema, table, limit=500, nameLike } = req.body || {};
    if (!safe(schema) || !safe(table)) throw new Error('Schema/tabella non validi');
    const lim = Math.min(Math.max(+limit || 1, 1), 2000);

    const params = [];
    let whereSQL = '';
    if (typeof nameLike === 'string' && nameLike.trim()) {
      whereSQL = `where exists (
        select 1 from information_schema.columns
        where table_schema=$1 and table_name=$2 and column_name='name'
      ) and "name" ilike $3`;
      params.push(schema, table, `%${nameLike}%`);
    }

    const sql = `
      select *
      from "${schema}"."${table}"
      ${whereSQL}
      limit ${lim} offset 0
    `;
    const { rows } = await pool.query(sql, params.length ? params : undefined);
    res.json({ rows });
  } catch(e){ next(e); }
  finally { pool.end().catch(()=>{}); }
});

app.use((err, req, res, next)=>{
  console.error(err);
  res.status(400).json({ error: err.message || 'Errore' });
});

const port = process.env.PORT || 5055;
app.listen(port, ()=> console.log(`API pronta su :${port}`));
