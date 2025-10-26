import { cookies } from 'next/headers';

export interface RepoSelection {
  owner: string;
  repo: string;
  branch: string;
}

export async function setRepoSelection(selection: RepoSelection) {
  const cookieStore = await cookies();
  cookieStore.set('repo-selection', JSON.stringify(selection), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getRepoSelection(): Promise<RepoSelection | null> {
  const cookieStore = await cookies();
  const selection = cookieStore.get('repo-selection');

  if (!selection) {
    return null;
  }

  try {
    return JSON.parse(selection.value);
  } catch {
    return null;
  }
}

export async function clearRepoSelection() {
  const cookieStore = await cookies();
  cookieStore.delete('repo-selection');
}
