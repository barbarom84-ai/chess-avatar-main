import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

  try {
    const profileRes = await fetch(`https://api.chess.com/pub/player/${username}`);
    if (!profileRes.ok) return NextResponse.json({ error: "Player not found", errorKey: "chesscomPlayerNotFound" }, { status: 404 });
    const profile = await profileRes.json();

    // 2. Récupérer les archives mensuelles (et non seulement le mois en cours)
    const archivesRes = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`);
    if (!archivesRes.ok) {
      return NextResponse.json({ error: "Chess.com API error", errorKey: "genericError" }, { status: 500 });
    }

    const archivesData = await archivesRes.json();
    const archiveUrls: string[] = Array.isArray(archivesData?.archives) ? archivesData.archives : [];

    if (archiveUrls.length === 0) {
      return NextResponse.json({ error: "No games found for this player", errorKey: "noGamesFound" }, { status: 404 });
    }

    // Parcourt les archives de la plus récente à la plus ancienne (max 12 mois)
    const recentArchiveUrls = archiveUrls.slice(-12).reverse();
    const collectedGames: any[] = [];

    for (const archiveUrl of recentArchiveUrls) {
      try {
        const monthlyRes = await fetch(archiveUrl);
        if (!monthlyRes.ok) continue;
        const monthlyData = await monthlyRes.json();
        if (Array.isArray(monthlyData?.games) && monthlyData.games.length > 0) {
          collectedGames.push(...monthlyData.games);
        }
        // On s'arrête tôt dès qu'on a assez de parties pour l'analyse.
        if (collectedGames.length >= 30) break;
      } catch {
        // Ignore un mois en erreur et continue sur le suivant.
      }
    }

    if (collectedGames.length === 0) {
      return NextResponse.json({ error: "No games found for this player", errorKey: "noGamesFound" }, { status: 404 });
    }

    collectedGames.sort((a, b) => (b?.end_time ?? 0) - (a?.end_time ?? 0));

    // 3. Normaliser les données pour qu'elles ressemblent à celles de Lichess
    // Notre frontend attend : { pgn: string, winner: string, players: ... }
    const normalizedGames = collectedGames.slice(0, 15).map((g: any, idx: number) => {
        const whiteUsername = g?.white?.username || "White";
        const blackUsername = g?.black?.username || "Black";

        // Déterminer le vainqueur
        let winner: "white" | "black" | null = null;
        if (g?.white?.result === "win") winner = "white";
        if (g?.black?.result === "win") winner = "black";

        return {
            id: g?.uuid || `${g?.end_time || Date.now()}-${idx}`,
            pgn: g?.pgn || "",
            winner: winner,
            createdAt: typeof g?.end_time === "number" ? g.end_time * 1000 : Date.now(),
            players: {
                white: { user: { name: whiteUsername, title: null } },
                black: { user: { name: blackUsername, title: null } }
            },
            // On passe l'avatar dans l'objet game pour l'utiliser plus tard si besoin
            userAvatar: profile.avatar 
        };
    });

    // On renvoie aussi l'avatar global dans le premier élément ou via une structure dédiée
    // Pour simplifier, on l'ajoute comme propriété spéciale au tableau (hack JS) ou on l'inclura dans l'analyse
    return NextResponse.json({ 
        games: normalizedGames, 
        avatarUrl: profile.avatar || "https://www.chess.com/bundles/web/images/user-image.svg" 
    });

  } catch (error) {
    return NextResponse.json({ error: "Chess.com API error", errorKey: "genericError" }, { status: 500 });
  }
}