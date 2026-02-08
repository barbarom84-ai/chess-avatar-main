import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  try {
    // 1. Récupérer le profil utilisateur pour l'avatar
    const profileResponse = await fetch(`https://lichess.org/api/user/${username}`);
    let avatarUrl = `https://lichess.org/assets/logo/lichess-pad3.svg`; // Avatar par défaut
    
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      avatarUrl = profileData.profile?.avatar || 
                  `https://lichess1.org/assets/_Qr0fOa/logo/lichess-favicon-512.png`;
    }

    // 2. Récupérer les parties
    const response = await fetch(
      `https://lichess.org/api/games/user/${username}?max=10&opening=true&pgnInJson=true`,
      {
        headers: {
          Accept: "application/x-ndjson",
        },
      }
    );

    if (response.status === 404) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Lichess API Error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const textData = await response.text();
    
    const games = textData
      .trim()
      .split("\n")
      .filter((line) => line !== "")
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter((game) => game !== null);

    return NextResponse.json({ games, avatarUrl });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}