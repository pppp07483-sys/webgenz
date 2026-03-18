import { NextRequest, NextResponse } from 'next/server';

// Job storage - in production use database
// For now, we'll use in-memory storage with localStorage sync via the client

// This API is mainly for checking job status from the frontend
// Since we're using localStorage on the client side, this serves as a status endpoint

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  
  try {
    // Since we're using localStorage on client side,
    // this endpoint just returns a processing status
    // The actual status is managed client-side
    
    // In a real implementation, you would check a database here
    // For now, we return processing status
    // The client will handle the actual status from localStorage
    
    return NextResponse.json({
      status: 'processing',
      message: 'Job is being processed. Check client-side storage for actual status.',
      jobId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Job status check error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error.message || 'Failed to check job status',
      jobId
    }, { status: 500 });
  }
}
