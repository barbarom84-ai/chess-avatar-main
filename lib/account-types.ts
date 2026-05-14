export type AccountProfile = {
  userId: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  memberSince: string | null;
  email?: string;
};

export type AccountFriend = {
  friendUserId: string;
  label: string;
  addedAt: string;
  displayName: string;
  avatarUrl: string | null;
};

export type AccountProfilePatch = {
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
};
