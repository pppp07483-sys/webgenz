import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '../store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  // Next.js 16: params is a Promise, must await
  const { jobId } = await params;
  
  console.log(`[Job Status] Checking job: ${jobId}`);
  
  try {
    const job = getJob(jobId);
    
    if (!job) {
      console.log(`[Job Status] Job not found: ${jobId}`);
      return NextResponse.json({
        status: 'not_found',
        error: 'Job tidak ditemukan',
        jobId
      }, { status: 404 });
    }
    
    // Calculate elapsed time
    const elapsed = Date.now() - job.createdAt;
    const elapsedMinutes = Math.floor(elapsed / 60000);
    
    console.log(`[Job Status] Job ${jobId}: ${job.status}, elapsed: ${elapsedMinutes}min`);
    
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
    console.error('[Job Status] Error:', error);
    return NextResponse.json({
      status: 'error',
      error: error.message || 'Failed to check job status',
      jobId
    }, { status: 500 });
  }
}
