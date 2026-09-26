import { createCloudApi } from './cloudApi';
import { createDemoApi } from './demoApi';
import type { AdminApi } from './types';

/** 示範版（VITE_DEMO=1）資料只存在瀏覽器；正式網站連 Cloudflare 資料庫。 */
export const isDemo = import.meta.env.VITE_DEMO === '1';

export const api: AdminApi = isDemo ? createDemoApi() : createCloudApi();
