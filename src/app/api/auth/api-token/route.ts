import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import {
  generateApiToken,
  listApiTokens,
  revokeApiToken,
  updateTokenIndex,
} from '@/lib/api-tokens';

/**
 * GET /api/auth/api-token
 * List all active API tokens for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tokens = await listApiTokens(user.id);

    // Return tokens without the hash (only lastFour for identification)
    const safeTokens = tokens.map((t) => ({
      tokenHash: t.tokenHash,
      name: t.name,
      lastFour: t.lastFour,
      createdAt: t.createdAt,
      expiresAt: t.expiresAt,
      lastUsedAt: t.lastUsedAt,
    }));

    return NextResponse.json({ data: safeTokens });
  } catch (error) {
    console.error('Error listing API tokens:', error);
    return NextResponse.json(
      { error: 'Failed to list API tokens' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/api-token
 * Generate a new long-lived API token.
 *
 * Request body:
 *   { name: string, expiresInDays?: number }
 *
 * Response:
 *   { data: { token: string, ...metadata } }
 *   The raw token is returned ONLY in this response. Store it securely.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, expiresInDays } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Token name is required' },
        { status: 400 }
      );
    }

    const { rawToken, token } = await generateApiToken(
      user.id,
      name.trim(),
      expiresInDays
    );

    // Update the global index so the token can be validated
    await updateTokenIndex(user.id);

    return NextResponse.json(
      {
        data: {
          token: rawToken,
          name: token.name,
          lastFour: token.lastFour,
          createdAt: token.createdAt,
          expiresAt: token.expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error generating API token:', error);
    return NextResponse.json(
      { error: 'Failed to generate API token' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/api-token
 * Revoke an API token.
 *
 * Request body:
 *   { tokenHash: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tokenHash } = body;

    if (!tokenHash || typeof tokenHash !== 'string') {
      return NextResponse.json(
        { error: 'tokenHash is required' },
        { status: 400 }
      );
    }

    const revoked = await revokeApiToken(user.id, tokenHash);

    if (!revoked) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    // Update the global index
    await updateTokenIndex(user.id);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Error revoking API token:', error);
    return NextResponse.json(
      { error: 'Failed to revoke API token' },
      { status: 500 }
    );
  }
}
