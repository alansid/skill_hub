import { createDemoApi } from './demoApi';
import { createSupabaseApi } from './supabaseApi';
import type { AdminApi } from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** 有設定 Supabase 就連正式資料庫，沒有就用示範模式。 */
export const api: AdminApi = url && key ? createSupabaseApi(url, key) : createDemoApi();
