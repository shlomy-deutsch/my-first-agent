import { NextRequest, NextResponse } from 'next/server';
import { handleSendMessage, validateAuthHeader } from '@/functions/messages';

export async function POST(req: NextRequest) {
  try {
    // Validate authentication
    const authHeader = req.headers.get('authorization');
    const isAuthorized = await validateAuthHeader(authHeader);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { message, userId, userEmail } = await req.json();

    // Call the message handler function
    const response = await handleSendMessage({
      message,
      userId,
      userEmail,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('[API Error] send-message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process message' },
      { status: 500 }
    );
  }
}
