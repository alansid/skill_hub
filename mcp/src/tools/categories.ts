import { getCategories } from '../api';

export async function handleCategories(_input: Record<string, never>) {
  const categories = await getCategories();
  return { categories };
}
