import { searchSkills, type SearchParams } from '../api';

export async function handleSearch(input: SearchParams) {
  return searchSkills(input);
}
