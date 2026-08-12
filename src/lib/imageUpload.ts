import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export interface StorageConfig {
  id: string;
  provider: string;
  cloudinary_cloud_name: string | null;
  cloudinary_upload_preset: string | null;
  folder: string | null;
  fallback_to_supabase: boolean;
}

let cached: StorageConfig | null = null;

export const getStorageConfig = async (force = false): Promise<StorageConfig | null> => {
  if (cached && !force) return cached;
  const { data } = await supabase
    .from("storage_config")
    .select("id, provider, cloudinary_cloud_name, cloudinary_upload_preset, folder, fallback_to_supabase")
    .limit(1)
    .maybeSingle();
  cached = (data as StorageConfig) || null;
  return cached;
};

export const clearStorageConfigCache = () => { cached = null; };

const uploadToCloudinary = async (file: File, cfg: StorageConfig): Promise<string> => {
  if (!cfg.cloudinary_cloud_name || !cfg.cloudinary_upload_preset) {
    throw new Error("Cloudinary is not fully configured");
  }
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", cfg.cloudinary_upload_preset);
  if (cfg.folder) body.append("folder", cfg.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudinary_cloud_name}/image/upload`, {
    method: "POST",
    body,
  });
  const json = await res.json();
  if (!res.ok || !json.secure_url) {
    throw new Error(json?.error?.message || "Cloudinary upload failed");
  }
  return json.secure_url as string;
};

const uploadToSupabase = async (file: File): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${session?.user.id || "anon"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("item-images").upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  const { data: signed } = await supabase.storage.from("item-images").createSignedUrl(path, TEN_YEARS);
  if (!signed?.signedUrl) throw new Error("Could not generate image link");
  return signed.signedUrl;
};

/** Uploads an image using the configured primary provider, falling back to database storage. */
export const uploadImage = async (file: File): Promise<{ url: string; provider: string; fellBack: boolean }> => {
  const cfg = await getStorageConfig();

  if (cfg && cfg.provider === "cloudinary") {
    try {
      const url = await uploadToCloudinary(file, cfg);
      return { url, provider: "cloudinary", fellBack: false };
    } catch (err) {
      if (!cfg.fallback_to_supabase) throw err;
      const url = await uploadToSupabase(file);
      return { url, provider: "supabase", fellBack: true };
    }
  }

  const url = await uploadToSupabase(file);
  return { url, provider: "supabase", fellBack: false };
};
