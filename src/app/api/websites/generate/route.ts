import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(request: NextRequest) {
  const requestId = `gen_${Date.now()}`;
  const startTime = Date.now();
  
  console.log(`[Generate ${requestId}] Starting website generation...`);
  
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error(`[Generate ${requestId}] Failed to parse request body`);
      return NextResponse.json({ 
        error: 'Request body tidak valid',
        requestId 
      }, { status: 400 });
    }
    
    const { prompt, jobId } = body;
    
    if (!prompt) {
      return NextResponse.json({ 
        error: 'Prompt diperlukan',
        requestId 
      }, { status: 400 });
    }
    
    console.log(`[Generate ${requestId}] Prompt length: ${prompt.length} characters`);
    console.log(`[Generate ${requestId}] Job ID: ${jobId}`);
    
    // Get Z-AI instance
    const zai = await getZAI();
    
    if (!zai) {
      console.error(`[Generate ${requestId}] Failed to initialize Z-AI`);
      return NextResponse.json({ 
        error: 'Gagal menginisialisasi AI. Coba lagi nanti.',
        requestId 
      }, { status: 500 });
    }
    
    console.log(`[Generate ${requestId}] Z-AI initialized, calling AI...`);
    
    // Call AI with the combined prompt
    let completion;
    try {
      completion = await zai.chat.completions.create({
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
    } catch (aiError: any) {
      console.error(`[Generate ${requestId}] AI API error:`, aiError);
      return NextResponse.json({ 
        error: `AI error: ${aiError.message || 'Unknown AI error'}`,
        requestId 
      }, { status: 500 });
    }
    
    const rawContent = completion.choices?.[0]?.message?.content;
    
    if (!rawContent) {
      console.error(`[Generate ${requestId}] AI returned empty content`);
      return NextResponse.json({ 
        error: 'AI tidak menghasilkan konten. Coba lagi.',
        requestId 
      }, { status: 500 });
    }
    
    if (rawContent.length < 100) {
      console.error(`[Generate ${requestId}] AI content too short: ${rawContent.length} chars`);
      return NextResponse.json({ 
        error: 'Konten AI terlalu pendek. Coba lagi.',
        requestId 
      }, { status: 500 });
    }
    
    console.log(`[Generate ${requestId}] Raw AI response: ${rawContent.length} characters`);
    
    // Clean up the HTML content
    const htmlContent = stripMarkdownCodeBlocks(rawContent);
    
    if (htmlContent.length < 100) {
      console.error(`[Generate ${requestId}] Cleaned content too short: ${htmlContent.length} chars`);
      return NextResponse.json({ 
        error: 'Konten HTML tidak valid. Coba lagi.',
        requestId 
      }, { status: 500 });
    }
    
    const duration = Date.now() - startTime;
    console.log(`[Generate ${requestId}] Success! Generated ${htmlContent.length} chars in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      htmlContent,
      duration,
      requestId,
      jobId
    });
    
  } catch (error: any) {
    console.error(`[Generate ${requestId}] Unexpected error:`, error);
    
    return NextResponse.json({ 
      error: `Terjadi kesalahan: ${error.message || 'Unknown error'}`,
      requestId 
    }, { status: 500 });
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json({ 
    message: 'Website Generate API',
    usage: 'POST with { prompt: string }' 
  });
}
