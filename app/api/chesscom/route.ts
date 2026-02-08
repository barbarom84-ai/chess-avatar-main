import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

  try {
    const profileRes = await fetch(`https://api.chess.com/pub/player/${username}`);
    if (!profileRes.ok) return NextResponse.json({ error: "Player not found", errorKey: "chesscomPlayerNotFound" }, { status: 404 });
    const profile = await profileRes.json();

    // 2. Récupérer les parties du MOIS EN COURS
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // ex: "05"

    const gamesRes = await fetch(`https://api.chess.com/pub/player/${username}/games/${year}/${month}`);
    const gamesData = await gamesRes.json();

    if (!gamesData.games || gamesData.games.length === 0) {
       // Si pas de partie ce mois-ci, on pourrait chercher le mois d'avant, mais restons simples pour l'instant
       return NextResponse.json({ error: "No games played this month on Chess.com", errorKey: "noGamesFound" }, { status: 404 });
    }

    // 3. Normaliser les données pour qu'elles ressemblent à celles de Lichess
    // Notre frontend attend : { pgn: string, winner: string, players: ... }
    const normalizedGames = gamesData.games.slice(-15).reverse().map((g: any) => {
        // Chess.com structure les joueurs différemment
        const isWhite = g.white.username.toLowerCase() === username.toLowerCase();
        const result = isWhite ? g.white.result : g.black.result;
        
        // Déterminer le vainqueur
        let winner = null;
        if (g.white.result === 'win') winner = 'white';
        if (g.black.result === 'win') winner = 'black';

        return {
            id: g.uuid,
            pgn: g.pgn,
            winner: winner,
            createdAt: g.end_time * 1000, // Timestamp
            players: {
                white: { user: { name: g.white.username, title: null } }, // Chess.com ne donne pas les titres facilement ici
                black: { user: { name: g.black.username, title: null } }
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