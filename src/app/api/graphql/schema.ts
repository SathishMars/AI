// INSIGHTS-SPECIFIC: GraphQL schema definitions
import { insightsArrivalsRows, insightsAttendeeColumns } from "@/app/lib/insights/data";

export const typeDefs = /* GraphQL */ `
  type Attendee {
    first_name: String
    middle_name: String
    last_name: String
    email: String
    phone: String
    mobile: String
    title: String
    mailing_address: String
    city: String
    state: String
    postal_code: String
    country: String
    company_name: String
    prefix: String
    employee_id: String
    concur_login_id: String
    attendee_type: String
    registration_status: String
    manual_status: String
    room_status: String
    air_status: String
    created_at: String
    updated_at: String
    internal_notes: String
  }

  type ArrivalsResult {
    rows: [Attendee!]!
    total: Int!
    limit: Int!
    offset: Int!
  }

  type Query {
    arrivals(q: String, limit: Int = 50, offset: Int = 0): ArrivalsResult!
    arrivalColumns: [String!]!
  }
`;

export const resolvers = {
  Query: {
    arrivalColumns: async () => {
      try {
        const { getInsightsPool } = await import("@/app/lib/insights/db");
        const pool = getInsightsPool();
        if (!pool) throw new Error("Database pool not available");

        const sql = `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'attendee'
            AND column_name <> 'id'
          ORDER BY ordinal_position;
        `;
        const { rows } = await pool.query(sql);
        return rows.map((r: { column_name: string }) => r.column_name);
      } catch (err) {
        console.error("DB Columns Fetch Failed, using fallback:", err);
        return insightsAttendeeColumns;
      }
    },

    arrivals: async (_: unknown, args: { q?: string; limit?: number; offset?: number }) => {
      console.log("[GraphQL] arrivals resolver called with args:", args);
      console.time("arrivals-resolver");

      // CRITICAL FIX #2: Input validation
      // Validate and sanitize inputs
      let q: string | null = null;
      if (args.q !== undefined && args.q !== null) {
        const sanitized = String(args.q).trim();
        if (sanitized.length > 200) {
          throw new Error("Search query exceeds maximum length of 200 characters");
        }
        // Only allow alphanumeric, spaces, and common search characters
        if (!/^[a-zA-Z0-9\s@._-]*$/.test(sanitized)) {
          throw new Error("Search query contains invalid characters");
        }
        q = sanitized.toLowerCase();
      }

      // Validate limit and offset are integers
      const limit = Math.max(1, Math.min(Math.floor(Number(args.limit) || 50), 200));
      const offset = Math.max(0, Math.floor(Number(args.offset) || 0));

      if (!Number.isInteger(limit) || !Number.isInteger(offset)) {
        throw new Error("Limit and offset must be integers");
      }

      try {
        const { getInsightsPool } = await import("@/app/lib/insights/db");
        const pool = getInsightsPool();
        if (!pool) {
          console.error("[GraphQL] Database pool not available (getInsightsPool returned null)");
          throw new Error("Database pool not available");
        }

        // CRITICAL FIX #1: Use fully parameterized queries - no string interpolation
        let dataSql: string;
        let countSql: string;
        let dataParams: (string | number)[];
        let countParams: (string | number)[];

        if (q && q.length > 0) {
          const searchPattern = `%${q}%`;
          // Fully parameterized WHERE clause - no string interpolation
          dataSql = `
            SELECT *
            FROM public.attendee
            WHERE
              COALESCE(first_name,'') ILIKE $1 OR
              COALESCE(last_name,'') ILIKE $1 OR
              COALESCE(email,'') ILIKE $1 OR
              COALESCE(company_name,'') ILIKE $1
            LIMIT $2
            OFFSET $3
          `;
          dataParams = [searchPattern, limit, offset];

          countSql = `
            SELECT COUNT(*)::int AS total
            FROM public.attendee
            WHERE
              COALESCE(first_name,'') ILIKE $1 OR
              COALESCE(last_name,'') ILIKE $1 OR
              COALESCE(email,'') ILIKE $1 OR
              COALESCE(company_name,'') ILIKE $1
          `;
          countParams = [searchPattern];
        } else {
          // No search - still use parameterized queries
          dataSql = `
            SELECT *
            FROM public.attendee
            LIMIT $1
            OFFSET $2
          `;
          dataParams = [limit, offset];

          countSql = `
            SELECT COUNT(*)::int AS total
            FROM public.attendee
          `;
          countParams = [];
        }

        console.log(
          "[GraphQL] Executing data query:",
          dataSql.replace(/\n\s+/g, " "),
          "with params:",
          dataParams
        );

        const [dataRes, countRes] = await Promise.all([
          pool.query(dataSql, dataParams),
          pool.query(countSql, countParams),
        ]);

        console.timeEnd("arrivals-resolver");
        console.log(
          `[GraphQL] DB fetch success. Rows: ${dataRes.rows.length}, Total: ${countRes.rows?.[0]?.total}`
        );

        return {
          rows: dataRes.rows,
          total: countRes.rows?.[0]?.total ?? 0,
          limit,
          offset,
        };
      } catch (err) {
        console.error("[GraphQL] DB Arrivals Fetch Failed, using fallback:", err);
        console.log("[GraphQL] Falling back to mock data...");

        // Mock filtering logic for the fallback
        let filtered = insightsArrivalsRows.map((r) => {
          const row: Record<string, string | null> = {};
          // Normalize keys to match GraphQL schema (snake_case)
          row.first_name = (r as any)["First Name"];
          row.middle_name = (r as any)["Middle Name"];
          row.last_name = (r as any)["Last Name"];
          row.email = (r as any)["Email"];
          row.phone = (r as any)["Phone"];
          row.mobile = (r as any)["Mobile"];
          row.title = (r as any)["Title"];
          row.mailing_address = (r as any)["Mailing Address"];
          row.city = (r as any)["City"];
          row.state = (r as any)["State"];
          row.postal_code = (r as any)["Postal Code"];
          row.country = (r as any)["Country"];
          row.company_name = (r as any)["Company Name"];
          row.prefix = (r as any)["Prefix"];
          row.employee_id = (r as any)["Employee Id"];
          row.concur_login_id = (r as any)["Concur Login Id"];
          row.attendee_type = (r as any)["Attendee Type"];
          row.registration_status = (r as any)["Registration Status"];
          row.manual_status = (r as any)["Manual Status"];
          row.room_status = (r as any)["Room Status"];
          row.air_status = (r as any)["Air Status"];
          row.created_at = (r as any)["Created At"];
          row.updated_at = (r as any)["Updated At"];
          row.internal_notes = (r as any)["Internal Notes"];
          return row;
        });

        if (q) {
          filtered = filtered.filter(
            (row) =>
              row.first_name?.toLowerCase().includes(q) ||
              row.last_name?.toLowerCase().includes(q) ||
              row.email?.toLowerCase().includes(q) ||
              row.company_name?.toLowerCase().includes(q)
          );
        }

        console.timeEnd("arrivals-resolver");
        console.log(
          `[GraphQL] Fallback success. Filtered rows: ${filtered.length}, Returning: ${filtered.slice(offset, offset + limit).length
          }`
        );

        return {
          rows: filtered.slice(offset, offset + limit),
          total: filtered.length,
          limit,
          offset,
        };
      }
    },
  },
};

