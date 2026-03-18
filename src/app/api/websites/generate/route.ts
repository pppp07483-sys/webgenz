import { NextRequest, NextResponse } from 'next/server';
import { createJob, updateJob, getJob, cleanupOldJobs } from '../../jobs/store';

// Initialize Z-AI SDK
async function getZAI() {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    return zai;
  } catch (error) {
    console.error('Failed to initialize Z-AI:', error);
    return null;
  }
}

// Strip markdown code blocks from AI response
function stripMarkdownCodeBlocks(content: string): string {
  let cleaned = content;
  
  // Remove ```html ... ``` blocks
  cleaned = cleaned.replace(/```html\s*\n?/gi, '');
  cleaned = cleaned.replace(/```\s*\n?/g, '');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  // Ensure it starts with <!DOCTYPE or <html
  const htmlStart = cleaned.toLowerCase().indexOf('<!doctype');
  const htmlStart2 = cleaned.toLowerCase().indexOf('<html');
  
  if (htmlStart > 0) {
    cleaned = cleaned.substring(htmlStart);
  } else if (htmlStart2 > 0) {
    cleaned = cleaned.substring(htmlStart2);
  }
  
  return cleaned;
}

// Background processing function
async function processJob(jobId: string, prompt: string, title: string) {
  const startTime = Date.now();
  console.log(`[Job ${jobId}] Starting background processing...`);
  
  try {
    const zai = await getZAI();
    
    if (!zai) {
      console.error(`[Job ${jobId}] Failed to initialize Z-AI`);
      updateJob(jobId, {
        status: 'failed',
        error: 'Gagal menginisialisasi AI'
      });
      return;
    }
    
    console.log(`[Job ${jobId}] Calling AI...`);
    
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Kamu adalah web developer profesional Indonesia yang ahli membuat website CINEMATIC dan PREMIUM.

ATURAN PENTING:
1. Output HARUS berupa HTML lengkap dalam 1 file
2. Gunakan <!DOCTYPE html> sebagai awal
3. Semua CSS harus dalam <style> di <head>
4. Semua JavaScript harus dalam <script> sebelum </body>
5. Gunakan CDN untuk library eksternal (GSAP, Three.js, Google Fonts)
6. Website harus RESPONSIVE dan bisa langsung dibuka di browser
7. Bahasa Indonesia untuk konten
8. Tidak ada placeholder atau logo kosong

LIBRARY CDN YANG TERSEDIA:
- GSAP: https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js
- GSAP ScrollTrigger: https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js
- Three.js: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
- Google Fonts: https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Poppins:wght@300;400;500;600&display=swap

FOOTER SEDERHANA:
- Hanya copyright © 2026 dan back to top button
- Tidak ada menu tambahan`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 8000,
      temperature: 0.7
    });
    
    const rawContent = completion.choices?.[0]?.message?.content;
    
    if (!rawContent || rawContent.length < 100) {
      console.error(`[Job ${jobId}] AI returned invalid content`);
      updateJob(jobId, {
        status: 'failed',
        error: 'AI tidak menghasilkan konten valid'
      });
      return;
    }
    
    const htmlContent = stripMarkdownCodeBlocks(rawContent);
    
    if (htmlContent.length < 100) {
      console.error(`[Job ${jobId}] Cleaned content too short`);
      updateJob(jobId, {
        status: 'failed',
        error: 'Konten HTML tidak valid'
      });
      return;
    }
    
    const duration = Date.now() - startTime;
    console.log(`[Job ${jobId}] Completed! ${htmlContent.length} chars in ${duration}ms`);
    
    // Update job with success
    updateJob(jobId, {
      status: 'completed',
      htmlContent
    });
    
  } catch (error: any) {
    console.error(`[Job ${jobId}] Error:`, error);
    updateJob(jobId, {
      status: 'failed',
      error: error.message || 'Unknown error'
    });
  }
}

export async function POST(request: NextRequest) {
  const requestId = `gen_${Date.now()}`;
  
  console.log(`[Generate ${requestId}] Request received`);
  
  // Clean up old jobs periodically
  cleanupOldJobs();
  
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ 
        error: 'Request body tidak valid' 
      }, { status: 400 });
    }
    
    const { prompt, jobId, title, userId } = body;
    
    if (!prompt || !jobId) {
      return NextResponse.json({ 
        error: 'Prompt dan jobId diperlukan' 
      }, { status: 400 });
    }
    
    // Create job in store
    createJob(jobId, title || 'Untitled', userId);
    console.log(`[Generate ${requestId}] Job created: ${jobId}`);
    
    // Start background processing (don't await)
    processJob(jobId, prompt, title || 'Untitled');
    
    // Return immediately with job ID
    return NextResponse.json({
      success: true,
      jobId,
      status: 'processing',
      message: 'Job started. Poll /api/jobs/[jobId] for status.'
    });
    
  } catch (error: any) {
    console.error(`[Generate ${requestId}] Error:`, error);
    return NextResponse.json({ 
      error: error.message || 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Website Generate API',
    usage: 'POST with { prompt: string, jobId: string, title: string }' 
  });
}
