"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type EnvironmentMode = "home" | "hospital" | "industrial";

export interface EnvironmentConfig {
  id: EnvironmentMode;
  name: string;
  shortName: string;
  // Terminology
  device: string;       // "Device" | "Medical Node" | "Industrial Node"
  devicePlural: string;
  zone: string;         // "Zone" | "Ward" | "Sector"
  zonePlural: string;
  threat: string;       // "Threat" | "Code" | "Incident"
  threatPlural: string;
  subject: string;      // "Subject" | "Patient" | "Personnel"
  subjectPlural: string;
  registry: string;     // "Device Registry" | "Node Registry" | "Equipment Registry"
  // Zones
  zones: [string, string, string, string];
  // Thresholds
  voltageRange: string;
  detectionMode: string;
  alertChannels: string;
  // UI
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
}

export const ENVIRONMENT_CONFIGS: Record<EnvironmentMode, EnvironmentConfig> = {
  home: {
    id: "home",
    name: "Home Environment",
    shortName: "HOME",
    device: "Device",
    devicePlural: "Devices",
    zone: "Zone",
    zonePlural: "Zones",
    threat: "Threat",
    threatPlural: "Threats",
    subject: "Subject",
    subjectPlural: "Subjects",
    registry: "Device Registry",
    zones: ["Living Room", "Server Room", "Garage Bay", "Master Suite"],
    voltageRange: "110–240V",
    detectionMode: "Residential",
    alertChannels: "Push / Email",
    badgeColor: "text-cyan-300",
    badgeBg: "bg-cyan-400/10",
    badgeBorder: "border-cyan-400/30",
  },
  hospital: {
    id: "hospital",
    name: "Hospital Facility",
    shortName: "HOSPITAL",
    device: "Medical Node",
    devicePlural: "Medical Nodes",
    zone: "Ward",
    zonePlural: "Wards",
    threat: "Code",
    threatPlural: "Codes",
    subject: "Patient",
    subjectPlural: "Patients",
    registry: "Node Registry",
    zones: ["ICU Ward", "Operating Room", "Pharmacy", "Storage Wing"],
    voltageRange: "110–240V (Medical Grade)",
    detectionMode: "Patient Safety",
    alertChannels: "Push / Pager / Email",
    badgeColor: "text-emerald-300",
    badgeBg: "bg-emerald-400/10",
    badgeBorder: "border-emerald-400/30",
  },
  industrial: {
    id: "industrial",
    name: "Industrial Site",
    shortName: "INDUSTRIAL",
    device: "Industrial Node",
    devicePlural: "Industrial Nodes",
    zone: "Sector",
    zonePlural: "Sectors",
    threat: "Incident",
    threatPlural: "Incidents",
    subject: "Personnel",
    subjectPlural: "Personnel",
    registry: "Equipment Registry",
    zones: ["Production Floor", "Control Room", "Loading Bay", "Silo"],
    voltageRange: "240–480V (3-Phase)",
    detectionMode: "Heavy Industry",
    alertChannels: "Push / SCADA / Siren",
    badgeColor: "text-orange-300",
    badgeBg: "bg-orange-400/10",
    badgeBorder: "border-orange-400/30",
  },
};

interface EnvironmentState {
  mode: EnvironmentMode;
  config: EnvironmentConfig;
  setMode: (mode: EnvironmentMode) => void;
}

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set) => ({
      mode: "home",
      config: ENVIRONMENT_CONFIGS.home,
      setMode: (mode) =>
        set({ mode, config: ENVIRONMENT_CONFIGS[mode] }),
    }),
    {
      name: "aura-environment",
    }
  )
);
