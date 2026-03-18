import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '../store';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  
  try {
    const job = getJob(jobId);
    
    if (!job) {
      return NextResponse.json({
        status: 'not_found',
        error: 'Job tidak ditemukan. Mungkin sudah expired atau belum dibuat.',
        jobId
      }, { status: 404 });
    }
    
    // Calculate elapsed time
    const elapsed = Date.now() - job.createdAt;
    const elapsedMinutes = Math.floor(elapsed / 60000);
    
    return NextResponse.json({
      id: job.id,
      title: job.title,
      status: job.status,
      createdAt: job.createdAt,
      elapsedMs: elapsed,
      elapsedMinutes,
      htmlContent: job.htmlContent,
      error: job.error
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
