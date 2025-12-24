// INSIGHTS-SPECIFIC: GraphQL schema definitions
import { insightsArrivalsRows, insightsAttendeeColumns } from "@/app/lib/insights/data";
import { upsertInsightsConversation, saveInsightsMessage } from "@/app/lib/insights/chatRepo";

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

  type ChatResponse {
    answer: String!
  }

  type Query {
    arrivals(q: String, limit: Int = 50, offset: Int = 0): ArrivalsResult!
    arrivalColumns: [String!]!
  }

  type Mutation {
    chat(conversationId: String!, text: String!): ChatResponse!
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

      const q = (args.q || "").trim().toLowerCase();
      const limit = Math.max(1, Math.min(args.limit ?? 50, 200));
      const offset = Math.max(0, args.offset ?? 0);

      try {
        const { getInsightsPool } = await import("@/app/lib/insights/db");
        const pool = getInsightsPool();
        if (!pool) {
          console.error("[GraphQL] Database pool not available (getInsightsPool returned null)");
          throw new Error("Database pool not available");
        }

        const where = q
          ? `
            WHERE
              COALESCE(first_name,'') ILIKE $1 OR
              COALESCE(last_name,'') ILIKE $1 OR
              COALESCE(email,'') ILIKE $1 OR
              COALESCE(company_name,'') ILIKE $1
          `
          : "";

        const params: (string | number)[] = [];
        if (q) params.push(`%${q}%`);
        params.push(limit, offset);

        const dataSql = `
          SELECT *
          FROM public.attendee
          ${where}
          LIMIT $${q ? 2 : 1}
          OFFSET $${q ? 3 : 2};
        `;

        console.log(
          "[GraphQL] Executing data query:",
          dataSql.replace(/\n\s+/g, " "),
          "with params:",
          params
        );

        const countSql = `
          SELECT COUNT(*)::int AS total
          FROM public.attendee
          ${where};
        `;

        const [dataRes, countRes] = await Promise.all([
          pool.query(dataSql, params),
          pool.query(countSql, q ? [`%${q}%`] : []),
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

  Mutation: {
    chat: async (_: unknown, args: { conversationId: string; text: string }, ctx: any) => {
      const { conversationId, text } = args;

      const db = ctx?.mongo;
      if (!db) {
        // This means route.ts context isn't passing mongo yet
        throw new Error("MongoDB not available in context. Ensure route.ts sets ctx.mongo.");
      }

      const userId = ctx?.user?.id ?? null;

      // 1) Upsert conversation record
      await upsertInsightsConversation(db, {
        conversationId,
        userId,
        title: "Aime Insights Chat",
      });

      // 2) Save user message
      await saveInsightsMessage(db, {
        conversationId,
        userId,
        role: "user",
        content: text,
      });

      // 3) Generate answer (POC placeholder — replace with your Text-to-SQL agent later)
      const answer =
        "Thanks — your message has been logged successfully. (Next: connect this mutation to the Text-to-SQL agent pipeline.)";

      // 4) Save assistant message
      await saveInsightsMessage(db, {
        conversationId,
        userId,
        role: "assistant",
        content: answer,
        meta: { poc: true },
      });

      return { answer };
    },
  },
};

