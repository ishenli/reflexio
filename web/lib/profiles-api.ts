import type { ProfileView, ProfileChangeLogView } from "./types";

export interface ProfilesData {
  allProfiles: ProfileView[];
  changeLogs: ProfileChangeLogView[];
  statistics: ProfileStatistics | null;
  loading: boolean;
  error: string | null;
}

export interface ProfileStatistics {
  current_count: number;
  pending_count: number;
  archived_count: number;
  expiring_soon_count: number;
}

export async function fetchAllProfiles(
  apiEndpoint: string,
  limit: number = 200
): Promise<ProfileView[]> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/get_all_profiles?limit=${limit}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch profiles (HTTP ${res.status})`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.msg || "Request failed");
  }

  return json.user_profiles as ProfileView[];
}

export async function fetchProfileStatistics(
  apiEndpoint: string
): Promise<ProfileStatistics> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/get_profile_statistics`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch profile stats (HTTP ${res.status})`);
  }

  return (await res.json()) as ProfileStatistics;
}

export async function fetchProfileChangeLogs(
  apiEndpoint: string
): Promise<ProfileChangeLogView[]> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/profile_change_log`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch change logs (HTTP ${res.status})`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.msg || "Request failed");
  }

  return json.profile_change_logs as ProfileChangeLogView[];
}

export interface ManualProfileGenerationParams {
  user_id?: string;
  source?: string;
  extractor_names?: string[];
}

export interface ManualProfileGenerationResult {
  success: boolean;
  msg?: string;
  profiles_generated?: number;
}

export interface ProfileGenerationOperationStatus {
  service_name: string;
  status: "in_progress" | "completed" | "failed" | "cancelled" | string;
  started_at: number;
  completed_at?: number | null;
  total_users: number;
  processed_users: number;
  failed_users: number;
  failed_user_ids?: { user_id: string; error: string }[];
  current_user_id?: string | null;
  error_message?: string | null;
  stats?: Record<string, unknown>;
  progress_percentage: number;
}

export interface ProfileGenerationOperationStatusResult {
  success: boolean;
  operation_status: ProfileGenerationOperationStatus | null;
  msg?: string | null;
}

export async function triggerManualProfileGeneration(
  apiEndpoint: string,
  params: ManualProfileGenerationParams
): Promise<ManualProfileGenerationResult> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/manual_profile_generation`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "reflexio-docs/1.0",
    },
    body: JSON.stringify({
      user_id: params.user_id || undefined,
      source: params.source || undefined,
      extractor_names: params.extractor_names?.length ? params.extractor_names : undefined,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || `Manual profile generation failed (HTTP ${res.status})`);
  }

  return (await res.json()) as ManualProfileGenerationResult;
}

export async function fetchProfileGenerationOperationStatus(
  apiEndpoint: string
): Promise<ProfileGenerationOperationStatusResult> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/get_operation_status?service_name=profile_generation`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch profile generation status (HTTP ${res.status})`);
  }

  return (await res.json()) as ProfileGenerationOperationStatusResult;
}

// ─── Upgrade / Downgrade Profiles ────────────────────────────────

export async function upgradeAllProfiles(
  apiEndpoint: string,
): Promise<{ success: boolean; msg?: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/upgrade_all_profiles`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to upgrade profiles (HTTP ${res.status})`);
  return res.json();
}

export async function downgradeAllProfiles(
  apiEndpoint: string,
): Promise<{ success: boolean; msg?: string }> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/downgrade_all_profiles`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to downgrade profiles (HTTP ${res.status})`);
  return res.json();
}

// ─── Single Profile Operations ─────────────────────────────────────

export interface UpdateProfileParams {
  user_id: string;
  profile_id: string;
  content?: string;
  custom_features?: Record<string, unknown> | null;
}

export interface UpdateProfileResult {
  success: boolean;
  msg?: string;
}

export async function updateProfile(
  apiEndpoint: string,
  params: UpdateProfileParams,
): Promise<UpdateProfileResult> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/update_user_profile`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Failed to update profile (HTTP ${res.status})`);
  return res.json();
}

export interface DeleteProfileParams {
  user_id: string;
  profile_id: string;
}

export interface DeleteProfileResult {
  success: boolean;
  msg?: string;
}

export async function deleteProfile(
  apiEndpoint: string,
  params: DeleteProfileParams,
): Promise<DeleteProfileResult> {
  const url = `${apiEndpoint.replace(/\/$/, "")}/api/delete_profile`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Failed to delete profile (HTTP ${res.status})`);
  return res.json();
}

export async function fetchAllProfilesData(
  apiEndpoint: string,
  limit: number = 200
): Promise<ProfilesData> {
  try {
    const [allProfiles, statistics, changeLogs] = await Promise.all([
      fetchAllProfiles(apiEndpoint, limit),
      fetchProfileStatistics(apiEndpoint),
      fetchProfileChangeLogs(apiEndpoint),
    ]);
    return {
      allProfiles,
      statistics,
      changeLogs,
      loading: false,
      error: null,
    };
  } catch (err) {
    return {
      allProfiles: [],
      statistics: null,
      changeLogs: [],
      loading: false,
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
