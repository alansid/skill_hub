// Cloudflare Pages 會把 /api/ 開頭的網址交給這裡處理
import { handle } from '../../server/router';
import type { Env } from '../../server/util';

export const onRequest: PagesFunction<Env> = ({ request, env }) => handle(request, env);
