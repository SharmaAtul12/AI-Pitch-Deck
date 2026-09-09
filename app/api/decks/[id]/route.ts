import prisma from "@/lib/db";
import { NextResponse } from "next/server";


type RouteParams = {
  params: Promise<{ id: string }>;
};

/** Get one deck with its slides (ordered). */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const deck = await prisma.deck.findUnique({
    where: { id },
    include: {
      slides: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  return NextResponse.json(deck);
}