/** Lichess / Chess.com–style usernames: letters, digits, underscore, hyphen. */
const USERNAME_RE = /^[a-zA-Z0-9_-]{1,50}$/;

export function isValidChessUsername(username: string): boolean {
  return USERNAME_RE.test(username);
}
