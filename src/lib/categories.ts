import {
  DoorOpen,
  Package,
  PawPrint,
  Hammer,
  Eye,
  Footprints,
  CircleEllipsis,
  Cone,
  Car,
  CarFront,
  Wrench,
  Trash2,
  AlertTriangle,
  HardHat,
  Ban,
  TrafficCone,
  Lamp,
  Waves,
  Snowflake,
  TreePine,
  Minus,
  Undo2,
  Gauge,
  PersonStanding,
  Bike,
  TrainFront,
  Rabbit,
  Signpost,
  HelpCircle,
  Battery,
  Wine,
  Laptop,
  Smartphone,
  Monitor,
  Cable,
  Microwave,
  Printer,
  Box,
  Anvil,
  Lightbulb,
  Recycle,
  type LucideIcon,
} from "lucide-react";
import type { IncidentCategory, RecyclingCategory } from "./supabase";

export interface CategoryMeta {
  id: IncidentCategory;
  label: string;
  icon: LucideIcon;
  badge: string;
  pinColor: string;
  glow: string;
}

const amber = {
  badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  pinColor: "#f59e0b",
  glow: "shadow-[0_0_12px_rgba(245,158,11,0.5)]",
};
const sky = {
  badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  pinColor: "#0ea5e9",
  glow: "shadow-[0_0_12px_rgba(14,165,233,0.5)]",
};
const red = {
  badge: "bg-red-500/15 text-red-300 border-red-500/30",
  pinColor: "#ef4444",
  glow: "shadow-[0_0_12px_rgba(239,68,68,0.5)]",
};
const slate = {
  badge: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  pinColor: "#94a3b8",
  glow: "shadow-[0_0_12px_rgba(148,163,184,0.4)]",
};

export const CATEGORIES: Record<IncidentCategory, CategoryMeta> = {
  open_garage: { id: "open_garage", label: "Open Garage Door", icon: DoorOpen, ...amber },
  unattended_package: { id: "unattended_package", label: "Unattended Package", icon: Package, ...sky },
  lost_pet: { id: "lost_pet", label: "Lost / Found Pet", icon: PawPrint, badge: "bg-blue-500/15 text-blue-300 border-blue-500/30", pinColor: "#3b82f6", glow: "shadow-[0_0_12px_rgba(59,130,246,0.5)]" },
  vandalism: { id: "vandalism", label: "Property Vandalism", icon: Hammer, badge: "bg-orange-500/15 text-orange-300 border-orange-500/30", pinColor: "#f97316", glow: "shadow-[0_0_12px_rgba(249,115,22,0.5)]" },
  suspicious_activity: { id: "suspicious_activity", label: "Suspicious Activity", icon: Eye, ...red },
  safe_walk: { id: "safe_walk", label: "Safe Walk Request", icon: Footprints, badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", pinColor: "#10b981", glow: "shadow-[0_0_12px_rgba(16,185,129,0.5)]" },
  other_security: { id: "other_security", label: "Other", icon: CircleEllipsis, ...slate },
  pothole: { id: "pothole", label: "Pothole", icon: Cone, ...amber },
  car_on_shoulder: { id: "car_on_shoulder", label: "Car on Shoulder", icon: Car, ...sky },
  accident: { id: "accident", label: "Accident / Collision", icon: CarFront, ...red },
  disabled_vehicle: { id: "disabled_vehicle", label: "Disabled Vehicle", icon: Wrench, ...amber },
  road_debris: { id: "road_debris", label: "Road Debris", icon: Trash2, ...slate },
  road_hazard: { id: "road_hazard", label: "Road Hazard", icon: AlertTriangle, ...red },
  construction: { id: "construction", label: "Construction", icon: HardHat, ...amber },
  road_closure: { id: "road_closure", label: "Road Closure", icon: Ban, ...red },
  traffic_signal: { id: "traffic_signal", label: "Traffic Signal Problem", icon: TrafficCone, ...amber },
  broken_streetlight: { id: "broken_streetlight", label: "Broken Streetlight", icon: Lamp, ...slate },
  flooded_road: { id: "flooded_road", label: "Flooded Road", icon: Waves, ...sky },
  icy_road: { id: "icy_road", label: "Icy / Slippery Road", icon: Snowflake, ...sky },
  fallen_tree: { id: "fallen_tree", label: "Fallen Tree", icon: TreePine, badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", pinColor: "#10b981", glow: "shadow-[0_0_12px_rgba(16,185,129,0.5)]" },
  obstruction: { id: "obstruction", label: "Obstruction in Road", icon: Minus, ...slate },
  wrong_way: { id: "wrong_way", label: "Wrong-Way Driver", icon: Undo2, ...red },
  dangerous_driving: { id: "dangerous_driving", label: "Dangerous Driving", icon: Gauge, ...red },
  pedestrian_hazard: { id: "pedestrian_hazard", label: "Pedestrian Hazard", icon: PersonStanding, ...amber },
  bike_lane: { id: "bike_lane", label: "Bike Lane Obstruction", icon: Bike, ...sky },
  railroad: { id: "railroad", label: "Railroad Crossing Problem", icon: TrainFront, ...slate },
  animal_on_road: { id: "animal_on_road", label: "Animal on Road", icon: Rabbit, ...amber },
  damaged_sign: { id: "damaged_sign", label: "Missing / Damaged Road Sign", icon: Signpost, ...slate },
  other_road: { id: "other_road", label: "Other Road Issue", icon: HelpCircle, ...slate },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

export const SECURITY_CATEGORIES: IncidentCategory[] = [
  "open_garage",
  "unattended_package",
  "vandalism",
  "suspicious_activity",
  "lost_pet",
  "other_security",
];

export const VEHICLE_CATEGORIES: IncidentCategory[] = [
  "pothole",
  "car_on_shoulder",
  "accident",
  "disabled_vehicle",
  "road_debris",
  "road_hazard",
  "construction",
  "road_closure",
  "traffic_signal",
  "broken_streetlight",
  "flooded_road",
  "icy_road",
  "fallen_tree",
  "obstruction",
  "wrong_way",
  "dangerous_driving",
  "pedestrian_hazard",
  "bike_lane",
  "railroad",
  "animal_on_road",
  "damaged_sign",
  "other_road",
];

export const RECYCLING_CATEGORIES: { id: RecyclingCategory; label: string; icon: LucideIcon }[] = [
  { id: "batteries", label: "Batteries", icon: Battery },
  { id: "glass", label: "Glass", icon: Wine },
  { id: "old_electronics", label: "Old Electronics", icon: Laptop },
  { id: "phones", label: "Phones", icon: Smartphone },
  { id: "computers", label: "Computers", icon: Monitor },
  { id: "cables", label: "Cables / Chargers", icon: Cable },
  { id: "small_appliances", label: "Small Appliances", icon: Microwave },
  { id: "printer_cartridges", label: "Printer Cartridges", icon: Printer },
  { id: "cardboard", label: "Cardboard", icon: Box },
  { id: "scrap_metal", label: "Scrap Metal", icon: Anvil },
  { id: "light_bulbs", label: "Light Bulbs", icon: Lightbulb },
  { id: "other_recyclables", label: "Other Recyclables", icon: Recycle },
];
