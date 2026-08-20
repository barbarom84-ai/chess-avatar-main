export type AccountPreferences = {
  botEngine?: "chessavatar" | "stockfish" | "auto";
};

export type AccountProfile = {
  userId: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  memberSince: string | null;
  email?: string;
  preferences?: AccountPreferences;
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
  preferences?: AccountPreferences;
};
