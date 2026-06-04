import { getSkillDetail } from '../api';

export async function handleGetSkill(input: { slug: string }) {
  try {
    return await getSkillDetail(input.slug);
  } catch (err) {
    return { error: (err as Error).message };
  }
}
