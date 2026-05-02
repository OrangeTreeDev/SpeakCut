export type AspectRatio = "9:16" | "16:9";

export interface ProjectSummary {
  project_id: string;
  title: string;
  status: string;
  aspect_ratio: AspectRatio;
  voice_id: string;
  total_duration_ms: number;
  scene_count: number;
  cover_image: string | null;
  updated_at: string;
  created_at: string;
}

export interface Scene {
  index: number;
  text: string;
  keywords_zh: string[];
  keywords_en: string[];
  sentiment: string;
  scene_description_en: string;
  duration_ms: number;
  selected_video: VideoAsset | null;
  candidate_videos: VideoAsset[];
  audio_url: string | null;
  word_boundaries: Array<{ text: string; offset_ms: number; duration_ms: number }>;
  timeline: {
    subtitles: Array<{ text: string; start_ms: number; end_ms: number }>;
  } | null;
}

export interface VideoAsset {
  id: number;
  thumbnail: string;
  video_url: string;
  duration: number;
  width: number;
  height: number;
}

export interface Project {
  project_id: string;
  status: string;
  aspect_ratio: AspectRatio;
  voice_id: string;
  total_duration_ms: number;
  subtitle_style: {
    font_family: string;
    font_size: number;
    color: string;
    stroke_color: string;
    stroke_width: number;
    background_color: string;
  };
  preview_url: string | null;
  error_message: string | null;
  scenes: Scene[];
}
