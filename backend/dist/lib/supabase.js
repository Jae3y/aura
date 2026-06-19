"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAnon = exports.supabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../config");
// Server client uses the service-role key — bypasses RLS for backend writes.
// We intentionally omit the Database generic here: the typed safety layer is
// provided by the explicit return types on each db/* helper function instead,
// which avoids Supabase v2's strict index-signature constraint on GenericTable.
exports.supabaseAdmin = (0, supabase_js_1.createClient)(config_1.config.SUPABASE_URL, config_1.config.SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});
// Browser/anon client — used only to verify user JWTs server-side.
exports.supabaseAnon = (0, supabase_js_1.createClient)(config_1.config.SUPABASE_URL, config_1.config.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});
//# sourceMappingURL=supabase.js.map