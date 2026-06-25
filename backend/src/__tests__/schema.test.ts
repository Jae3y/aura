/**
 * Schema validation tests for AURA's Supabase migration.
 *
 * These tests parse `supabase/migrations/001_aura_schema.sql` statically —
 * no live database required.  They assert:
 *   1. All 9 required tables are defined in the migration.
 *   2. RLS is enabled on every table.
 *   3. Every table has an RLS policy that references auth.uid().
 *   4. The two performance indexes exist on the correct columns.
 *   5. Key column types (UUID, FLOAT, BOOLEAN, TIMESTAMPTZ, TEXT, INT,
 *      BIGINT, DATE, JSONB) are present where the design requires them.
 *   6. Critical CHECK constraints are present.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeAll } from 'vitest';

// ---------------------------------------------------------------------------
// Load the migration file once for all tests
// ---------------------------------------------------------------------------

let sql: string;

beforeAll(() => {
  const migrationPath = join(
    __dirname,           // backend/src/__tests__
    '..', '..', '..', // → project root (aura/)
    'supabase', 'migrations', '001_aura_schema.sql'
  );
  sql = readFileSync(migrationPath, 'utf-8');
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the text of the CREATE TABLE block for a given table name. */
function getTableBlock(tableName: string): string {
  // Match from "CREATE TABLE public.<name>" up to the closing ");"
  const regex = new RegExp(
    `CREATE TABLE public\\.${tableName}\\s*\\([\\s\\S]*?\\);`,
    'i'
  );
  const match = sql.match(regex);
  return match ? match[0] : '';
}

/** True if the SQL contains ALTER TABLE public.<name> ENABLE ROW LEVEL SECURITY */
function hasRls(tableName: string): boolean {
  const pattern = new RegExp(
    `ALTER TABLE public\\.${tableName}\\s+ENABLE ROW LEVEL SECURITY`,
    'i'
  );
  return pattern.test(sql);
}

/** True if there is at least one CREATE POLICY ... ON public.<name> that mentions auth.uid() */
function hasPolicyWithAuthUid(tableName: string): boolean {
  const policyBlockRegex = new RegExp(
    `CREATE POLICY \\w+ ON public\\.${tableName}[\\s\\S]*?auth\\.uid\\(\\)`,
    'i'
  );
  return policyBlockRegex.test(sql);
}

// ---------------------------------------------------------------------------
// 1. Table existence
// ---------------------------------------------------------------------------

describe('Table existence — all 9 required tables', () => {
  const REQUIRED_TABLES = [
    'profiles',
    'devices',
    'sensor_readings',
    'zones',
    'threat_events',
    'automations',
    'voice_commands',
    'notifications',
    'monthly_reports',
  ] as const;

  for (const table of REQUIRED_TABLES) {
    it(`defines table "${table}"`, () => {
      expect(
        sql,
        `Expected CREATE TABLE public.${table} in migration`
      ).toMatch(new RegExp(`CREATE TABLE public\\.${table}\\s*\\(`, 'i'));
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Row Level Security enabled on all 9 tables
// ---------------------------------------------------------------------------

describe('Row Level Security — ENABLE ROW LEVEL SECURITY on all tables', () => {
  const TABLES_WITH_RLS = [
    'profiles',
    'devices',
    'sensor_readings',
    'zones',
    'threat_events',
    'automations',
    'voice_commands',
    'notifications',
    'monthly_reports',
  ] as const;

  for (const table of TABLES_WITH_RLS) {
    it(`enables RLS on "${table}"`, () => {
      expect(
        hasRls(table),
        `Expected ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`
      ).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// 3. RLS policies use auth.uid() (cross-user isolation)
// ---------------------------------------------------------------------------

describe('RLS policies — each table has a policy referencing auth.uid()', () => {
  const POLICY_TABLES = [
    'profiles',
    'devices',
    'sensor_readings',
    'zones',
    'threat_events',
    'automations',
    'voice_commands',
    'notifications',
    'monthly_reports',
  ] as const;

  for (const table of POLICY_TABLES) {
    it(`"${table}" has a CREATE POLICY that references auth.uid()`, () => {
      expect(
        hasPolicyWithAuthUid(table),
        `Expected a CREATE POLICY ON public.${table} using auth.uid()`
      ).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// 4. Indexes on sensor_readings and threat_events
// ---------------------------------------------------------------------------

describe('Indexes', () => {
  it('index on sensor_readings(device_id, recorded_at)', () => {
    // The index must be ON public.sensor_readings and include both columns.
    expect(sql).toMatch(
      /CREATE INDEX\s+\w+\s+ON public\.sensor_readings\s*\(\s*device_id\s*,\s*recorded_at/i
    );
  });

  it('index on threat_events(device_id, occurred_at)', () => {
    expect(sql).toMatch(
      /CREATE INDEX\s+\w+\s+ON public\.threat_events\s*\(\s*device_id\s*,\s*occurred_at/i
    );
  });
});

// ---------------------------------------------------------------------------
// 5. Key column types per table
// ---------------------------------------------------------------------------

describe('Column types — profiles', () => {
  it('id is UUID PRIMARY KEY', () => {
    const block = getTableBlock('profiles');
    expect(block).toMatch(/\bid\b\s+UUID\s+PRIMARY KEY/i);
  });

  it('email is TEXT UNIQUE NOT NULL', () => {
    const block = getTableBlock('profiles');
    expect(block).toMatch(/\bemail\b\s+TEXT\s+UNIQUE\s+NOT NULL/i);
  });

  it('notification_email and notification_push are BOOLEAN', () => {
    const block = getTableBlock('profiles');
    expect(block).toMatch(/\bnotification_email\b\s+BOOLEAN/i);
    expect(block).toMatch(/\bnotification_push\b\s+BOOLEAN/i);
  });

  it('created_at and updated_at are TIMESTAMPTZ', () => {
    const block = getTableBlock('profiles');
    expect(block).toMatch(/\bcreated_at\b\s+TIMESTAMPTZ/i);
    expect(block).toMatch(/\bupdated_at\b\s+TIMESTAMPTZ/i);
  });
});

describe('Column types — devices', () => {
  it('user_id is UUID NOT NULL', () => {
    const block = getTableBlock('devices');
    expect(block).toMatch(/\buser_id\b\s+UUID\s+NOT NULL/i);
  });

  it('device_token is TEXT UNIQUE NOT NULL', () => {
    const block = getTableBlock('devices');
    expect(block).toMatch(/\bdevice_token\b\s+TEXT\s+UNIQUE\s+NOT NULL/i);
  });

  it('voltage_threshold_min and voltage_threshold_max are FLOAT', () => {
    const block = getTableBlock('devices');
    expect(block).toMatch(/\bvoltage_threshold_min\b\s+FLOAT/i);
    expect(block).toMatch(/\bvoltage_threshold_max\b\s+FLOAT/i);
  });

  it('is_online is BOOLEAN', () => {
    const block = getTableBlock('devices');
    expect(block).toMatch(/\bis_online\b\s+BOOLEAN/i);
  });
});

describe('Column types — sensor_readings', () => {
  it('voltage, current_amps, power_watts, frequency, power_factor are FLOAT NOT NULL', () => {
    const block = getTableBlock('sensor_readings');
    expect(block).toMatch(/\bvoltage\b\s+FLOAT\s+NOT NULL/i);
    expect(block).toMatch(/\bcurrent_amps\b\s+FLOAT\s+NOT NULL/i);
    expect(block).toMatch(/\bpower_watts\b\s+FLOAT\s+NOT NULL/i);
    expect(block).toMatch(/\bfrequency\b\s+FLOAT\s+NOT NULL/i);
    expect(block).toMatch(/\bpower_factor\b\s+FLOAT\s+NOT NULL/i);
  });

  it('is_anomaly is BOOLEAN', () => {
    const block = getTableBlock('sensor_readings');
    expect(block).toMatch(/\bis_anomaly\b\s+BOOLEAN/i);
  });

  it('recorded_at is TIMESTAMPTZ', () => {
    const block = getTableBlock('sensor_readings');
    expect(block).toMatch(/\brecorded_at\b\s+TIMESTAMPTZ/i);
  });
});

describe('Column types — threat_events', () => {
  it('solana_slot is BIGINT', () => {
    const block = getTableBlock('threat_events');
    expect(block).toMatch(/\bsolana_slot\b\s+BIGINT/i);
  });

  it('relay_channel is INT', () => {
    const block = getTableBlock('threat_events');
    expect(block).toMatch(/\brelay_channel\b\s+INT/i);
  });

  it('occurred_at is TIMESTAMPTZ', () => {
    const block = getTableBlock('threat_events');
    expect(block).toMatch(/\boccurred_at\b\s+TIMESTAMPTZ/i);
  });

  it('solana_confirmed and lisk_confirmed are BOOLEAN', () => {
    const block = getTableBlock('threat_events');
    expect(block).toMatch(/\bsolana_confirmed\b\s+BOOLEAN/i);
    expect(block).toMatch(/\blisk_confirmed\b\s+BOOLEAN/i);
  });
});

describe('Column types — automations', () => {
  it('trigger_value is JSONB', () => {
    const block = getTableBlock('automations');
    expect(block).toMatch(/\btrigger_value\b\s+JSONB/i);
  });

  it('trigger_count is INT', () => {
    const block = getTableBlock('automations');
    expect(block).toMatch(/\btrigger_count\b\s+INT/i);
  });
});

describe('Column types — monthly_reports', () => {
  it('report_month is DATE', () => {
    const block = getTableBlock('monthly_reports');
    expect(block).toMatch(/\breport_month\b\s+DATE/i);
  });

  it('aura_health_score is INT', () => {
    const block = getTableBlock('monthly_reports');
    expect(block).toMatch(/\baura_health_score\b\s+INT/i);
  });

  it('alerta_ack_rate is FLOAT', () => {
    const block = getTableBlock('monthly_reports');
    expect(block).toMatch(/\balerta_ack_rate\b\s+FLOAT/i);
  });

  it('unique constraint on (device_id, report_month)', () => {
    const block = getTableBlock('monthly_reports');
    expect(block).toMatch(/UNIQUE\s*\(\s*device_id\s*,\s*report_month\s*\)/i);
  });
});

// ---------------------------------------------------------------------------
// 6. CHECK constraints
// ---------------------------------------------------------------------------

describe('CHECK constraints', () => {
  it('profiles.environment_type accepts only home/hospital/industrial', () => {
    const block = getTableBlock('profiles');
    expect(block).toMatch(/CHECK\s*\(\s*environment_type\s+IN\s*\(\s*'home'\s*,\s*'hospital'\s*,\s*'industrial'\s*\)\s*\)/i);
  });

  it('devices.surge_sensitivity accepts only low/medium/high', () => {
    const block = getTableBlock('devices');
    expect(block).toMatch(/CHECK\s*\(\s*surge_sensitivity\s+IN\s*\(\s*'low'\s*,\s*'medium'\s*,\s*'high'\s*\)\s*\)/i);
  });

  it('zones.zone_type accepts only general/restricted/critical', () => {
    const block = getTableBlock('zones');
    expect(block).toMatch(/CHECK\s*\(\s*zone_type\s+IN\s*\(\s*'general'\s*,\s*'restricted'\s*,\s*'critical'\s*\)\s*\)/i);
  });

  it('threat_events.event_type covers all 6 required values', () => {
    const block = getTableBlock('threat_events');
    expect(block).toMatch(/'surge'/i);
    expect(block).toMatch(/'intrusion'/i);
    expect(block).toMatch(/'undervoltage'/i);
    expect(block).toMatch(/'overcurrent'/i);
    expect(block).toMatch(/'frequency_anomaly'/i);
    expect(block).toMatch(/'system_fault'/i);
  });

  it('threat_events.severity accepts only low/medium/high/critical', () => {
    const block = getTableBlock('threat_events');
    expect(block).toMatch(/CHECK\s*\(\s*severity\s+IN\s*\(\s*'low'\s*,\s*'medium'\s*,\s*'high'\s*,\s*'critical'\s*\)\s*\)/i);
  });

  it('threat_events.alerta_status accepts only open/ack/closed', () => {
    const block = getTableBlock('threat_events');
    expect(block).toMatch(/CHECK\s*\(\s*alerta_status\s+IN\s*\(\s*'open'\s*,\s*'ack'\s*,\s*'closed'\s*\)\s*\)/i);
  });

  it('automations.trigger_type covers all 5 required values', () => {
    const block = getTableBlock('automations');
    expect(block).toMatch(/'schedule'/i);
    expect(block).toMatch(/'surge'/i);
    expect(block).toMatch(/'presence'/i);
    expect(block).toMatch(/'voice_command'/i);
    expect(block).toMatch(/'manual'/i);
  });

  it('notifications.type accepts only push/email/in_app', () => {
    const block = getTableBlock('notifications');
    expect(block).toMatch(/CHECK\s*\(\s*type\s+IN\s*\(\s*'push'\s*,\s*'email'\s*,\s*'in_app'\s*\)\s*\)/i);
  });

  it('monthly_reports.aura_health_score is between 0 and 100', () => {
    const block = getTableBlock('monthly_reports');
    expect(block).toMatch(/CHECK\s*\(\s*aura_health_score\s+BETWEEN\s+0\s+AND\s+100\s*\)/i);
  });
});
