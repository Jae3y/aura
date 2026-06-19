export interface ScoreInputs {
  totalThreats: number;
  relayActivations: number;
  totalAnomalies: number;
  totalReadings: number;
  // Fraction of the period the device was online (0..1).
  uptimeRatio: number;
}

// Calculates an AURA health score (0-100). A pristine device with no threats,
// no anomalies, and full uptime scores 100. Each factor deducts points.
export function calculateHealthScore(inputs: ScoreInputs): number {
  const {
    totalThreats,
    relayActivations,
    totalAnomalies,
    totalReadings,
    uptimeRatio,
  } = inputs;

  // Threat frequency penalty — up to 35 points.
  const threatPenalty = Math.min(35, totalThreats * 3);

  // Relay trip penalty — up to 20 points.
  const relayPenalty = Math.min(20, relayActivations * 2);

  // Anomaly rate penalty — up to 25 points, proportional to anomaly fraction.
  const anomalyRate =
    totalReadings > 0 ? totalAnomalies / totalReadings : 0;
  const anomalyPenalty = Math.min(25, Math.round(anomalyRate * 100));

  // Uptime penalty — up to 20 points for downtime.
  const uptimePenalty = Math.round((1 - clamp01(uptimeRatio)) * 20);

  const score =
    100 - threatPenalty - relayPenalty - anomalyPenalty - uptimePenalty;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
