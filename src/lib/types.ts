export type Cafe = {
  id: string;
  google_place_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  hours_json: GoogleHours | null;
  google_rating: number | null;
  last_synced_at: string;
  created_at: string;
};

export type Visit = {
  id: string;
  user_id: string;
  cafe_id: string;
  visited_at: string;
  has_wifi: boolean | null;
  has_outlets: boolean | null;
  rating_seating: number | null;
  rating_busy: number | null;
  note_text: string | null;
  created_at: string;
};

export type VisitPhoto = {
  id: string;
  visit_id: string;
  user_id: string;
  storage_path: string;
  created_at: string;
};

export type Tag = {
  id: string;
  user_id: string;
  label: string;
  created_at: string;
};

export type GoogleHours = {
  weekday_text?: string[];
  open_now?: boolean;
  periods?: unknown;
};

// Yes/no signals — most recent visit wins when summarizing.
export const BOOL_SIGNALS = ["wifi", "outlets"] as const;
export type BoolSignal = (typeof BOOL_SIGNALS)[number];

// 1–5 signals — averaged across visits.
export const RATING_SIGNALS = ["seating", "busy"] as const;
export type RatingSignal = (typeof RATING_SIGNALS)[number];

export const SIGNAL_LABELS: Record<BoolSignal | RatingSignal, string> = {
  wifi: "Wifi",
  outlets: "Outlets",
  seating: "Seating",
  busy: "How busy",
};

export const BOOL_FIELD: Record<BoolSignal, "has_wifi" | "has_outlets"> = {
  wifi: "has_wifi",
  outlets: "has_outlets",
};

export const RATING_FIELD: Record<RatingSignal, "rating_seating" | "rating_busy"> = {
  seating: "rating_seating",
  busy: "rating_busy",
};
