import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserSettings, saveUserSettings, UserSettings } from '@/lib/user-settings';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getUserSettings(session.user.id);
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings: UserSettings = await request.json();
    
    const success = await saveUserSettings(session.user.id, settings);
    
    if (success) {
      return NextResponse.json({ message: 'Settings saved successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to save settings' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error saving user settings:', error);
    return NextResponse.json(
      { error: 'Failed to save user settings' },
      { status: 500 }
    );
  }
}