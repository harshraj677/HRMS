/**
 * Run once locally to install the _run_sql helper function in Supabase.
 * This lets server-side code execute parameterized SQL via HTTPS RPC,
 * completely bypassing the IPv6-only direct TCP connection.
 *
 *   node scripts/install-rpc.js
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to Supabase.");

  // Inline each $N placeholder with a properly typed literal so we never hit
  // the text→integer implicit cast problem in EXECUTE … USING text[].
  // - JSON numbers  → inlined without quotes (e.g. 42)
  // - JSON booleans → inlined as true/false
  // - JSON null     → inlined as NULL
  // - JSON strings  → inlined via quote_literal() to prevent injection
  await client.query(`
    CREATE OR REPLACE FUNCTION _run_sql(q text, params jsonb DEFAULT '[]'::jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      v_rows      jsonb;
      v_rowcount  int := 0;
      i           int;
      val         jsonb;
      typed_val   text;
      final_q     text;
    BEGIN
      -- Replace each $N with its properly-typed literal value
      final_q := q;
      FOR i IN 1..COALESCE(jsonb_array_length(params), 0) LOOP
        val := params->(i-1);
        IF val IS NULL OR val = 'null'::jsonb THEN
          typed_val := 'NULL';
        ELSIF jsonb_typeof(val) = 'number' THEN
          typed_val := val::text;
        ELSIF jsonb_typeof(val) = 'boolean' THEN
          typed_val := val::text;
        ELSE
          typed_val := quote_literal(val #>> '{}');
        END IF;
        final_q := replace(final_q, '$' || i::text, typed_val);
      END LOOP;

      IF final_q ~* '^\s*(INSERT|UPDATE|DELETE)' THEN
        IF final_q ~* 'RETURNING' THEN
          EXECUTE 'SELECT COALESCE(jsonb_agg(r),''[]''::jsonb) FROM (' || final_q || ') r'
            INTO v_rows;
          v_rowcount := jsonb_array_length(v_rows);
        ELSE
          EXECUTE final_q;
          GET DIAGNOSTICS v_rowcount = ROW_COUNT;
          v_rows := '[]'::jsonb;
        END IF;
        RETURN jsonb_build_object(
          'rows',         v_rows,
          'affectedRows', v_rowcount,
          'insertId',     COALESCE((v_rows->0->>'id')::int, 0)
        );
      ELSE
        EXECUTE 'SELECT COALESCE(jsonb_agg(r),''[]''::jsonb) FROM (' || final_q || ') r'
          INTO v_rows;
        RETURN jsonb_build_object(
          'rows',         COALESCE(v_rows, '[]'::jsonb),
          'affectedRows', jsonb_array_length(COALESCE(v_rows, '[]'::jsonb)),
          'insertId',     0
        );
      END IF;
    END;
    $$;
  `);
  console.log("Created _run_sql function (v2 — inline typed literals).");

  await client.query(`
    GRANT EXECUTE ON FUNCTION _run_sql(text, jsonb) TO anon, authenticated, service_role;
  `);
  console.log("Granted EXECUTE to anon / authenticated / service_role.");

  await client.end();
  console.log("Done! Deploy and login should work.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
