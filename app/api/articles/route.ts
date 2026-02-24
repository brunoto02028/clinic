import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isDbUnreachableError, MOCK_ARTICLES, devFallbackResponse } from "@/lib/dev-fallback";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const published = searchParams.get("published");
    const limit = searchParams.get("limit");
    
    const articles = await prisma.article.findMany({
      where: published === "true" ? { published: true } : undefined,
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit ? parseInt(limit) : undefined,
    });
    
    return NextResponse.json(articles);
  } catch (error) {
    console.error("Error fetching articles:", error);
    if (isDbUnreachableError(error)) {
      return devFallbackResponse(MOCK_ARTICLES);
    }
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    const userRole = (session?.user as { role?: string })?.role;
    if (!session || !userRole || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(userRole)) {
      return NextResponse.json(
        { error: "Unauthorised" },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { title, excerpt, content, imageUrl, published, authorName } = body;
    
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    
    const article = await prisma.article.create({
      data: {
        title,
        slug,
        excerpt,
        content,
        imageUrl,
        published: published || false,
        authorId: (session.user as { id: string }).id,
        authorName: authorName || null,
      },
    });
    
    return NextResponse.json(article);
  } catch (error) {
    console.error("Error creating article:", error);
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 }
    );
  }
}
