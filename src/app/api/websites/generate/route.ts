import { NextRequest, NextResponse } from 'next/server';
import { createJob, updateJob, cleanupOldJobs } from '../../jobs/store';

// Initialize Z-AI SDK
async function getZAI() {
  try {
    console.log('[Z-AI] Initializing...');
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    console.log('[Z-AI] Initialized successfully');
    return zai;
  } catch (error: any) {
    console.error('[Z-AI] Failed to initialize:', error);
    return null;
  }
}

// Strip markdown code blocks from AI response
function stripMarkdownCodeBlocks(content: string): string {
  let cleaned = content;
  cleaned = cleaned.replace(/```html\s*\n?/gi, '');
  cleaned = cleaned.replace(/```\s*\n?/g, '');
  cleaned = cleaned.trim();
  
  const htmlStart = cleaned.toLowerCase().indexOf('<!doctype');
  const htmlStart2 = cleaned.toLowerCase().indexOf('<html');
  
  if (htmlStart > 0) {
    cleaned = cleaned.substring(htmlStart);
  } else if (htmlStart2 > 0) {
    cleaned = cleaned.substring(htmlStart2);
  }
  
  return cleaned;
}

// Loader CSS to inject - MINIMAL, NO SCROLL BLOCKING
const LOADER_CSS = `<style>
#loader{position:fixed;inset:0;background:linear-gradient(135deg,#1a1a2e,#16213e);display:flex;align-items:center;justify-content:center;z-index:9999;flex-direction:column;gap:20px;transition:opacity 0.3s;}
.loader-spinner{width:50px;height:50px;border:3px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 1s linear infinite;}
.loader-text{color:white;font-family:Poppins,sans-serif;font-size:14px;letter-spacing:2px;}
@keyframes spin{to{transform:rotate(360deg);}}
.hidden{display:none!important;}
</style>`;

// Loader HTML to inject
const LOADER_HTML = `<div id="loader"><div class="loader-spinner"></div><div class="loader-text">Loading...</div></div>`;

// Loader JS to inject - SAFE, ONLY HIDES LOADER, NEVER TOUCHES CONTENT
const LOADER_JS = `<script>
(function(){
  setTimeout(function(){
    var l=document.getElementById('loader');
    if(l){l.classList.add('hidden');}
  },1500);
})();
</script>`;

// System prompt for NEW website generation - EDUCATIONAL, NO IMAGES, NO SCROLL BLOCKING
const SYSTEM_PROMPT = `Buat website HTML lengkap dalam 1 file.

KONTEN:
- FAKTUAL dan bisa dibuktikan
- Berdasarkan fakta nyata saja
- Jangan tulis hal yang tidak pasti
- Jangan lebay atau mengada-ada
- Bahasa sederhana dan mudah dipahami
- Padat, singkat, langsung ke poin
- Hindari klaim besar yang tidak berdasar
- Jika tidak tahu, jangan karang-karang
- Konten sesuai judul saja, tidak melebar
- 100% WAJIB SELESAI sampai akhir, tidak terpotong

LARANGAN MUTLAK (DILARANG KERAS):
- DILARANG pakai tag <img> sama sekali
- DILARANG pakai background-image dengan url()
- DILARANG pakai unsplash, picsum, placeholder gambar
- DILARANG pakai IntersectionObserver
- DILARANG pakai ScrollTrigger atau GSAP scroll
- DILARANG ada setTimeout yang hide/menghapus konten
- DILARANG set document.body.style.display = 'none'
- DILARANG set overflow:hidden pada body/html
- DILARANG set pointer-events:none pada body
- DILARANG ada script yang clear innerHTML
- DILARANG ada script yang destroy konten setelah animasi

CSS WAJIB (COPY PASTE EXACTLY):
html, body {
  overflow-x: hidden;
  overflow-y: auto !important;
  height: auto !important;
  position: static !important;
}

STRUKTUR WEBSITE:
1. NAV - Menu navigasi minimal 4 link, sticky top
2. HERO - H1 judul besar + paragraf pengantar + tombol CTA
3. KONTEN UTAMA - Artikel/penjelasan sesuai judul:
   - H2 untuk sub-judul section
   - H3 untuk poin-poin
   - Paragraf penjelasan yang jelas
   - Bullet points atau numbered list dengan detail
   - Minimal 5-8 section konten
4. FOOTER - Copyright + link navigasi

STYLE:
- Tailwind CSS dari CDN: https://cdn.tailwindcss.com
- Google Fonts: Playfair Display (judul) + Poppins (body)
- Warna: pilih palette yang sesuai tema
- Responsive: mobile-first
- Layout bersih dan mudah dibaca
- Typography yang jelas
- Scroll HARUS berfungsi normal

PENTING - WAJIB SELESAI SAMPAI AKHIR:
- HARUS selesaikan SEMUA kalimat dan paragraf
- JANGAN berhenti di tengah kalimat
- JANGAN berhenti di tengah paragraf
- Jangan potong teks di tengah
- Tutup dengan tag HTML yang benar: </div></section></main></body></html>
- Pastikan HTML valid dan tertutup sempurna

WAJIB: akhiri dengan </body></html>
Gunakan CDN Tailwind dan Google Fonts.`;

export async function POST(request: NextRequest) {
  const requestId = 'gen_' + Date.now();
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(50));
  console.log('[Generate ' + requestId + '] START');
  
  cleanupOldJobs();
  
  try {
    // Step 1: Parse body
    console.log('[Generate ' + requestId + '] Step 1: Parsing body...');
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 });
    }
    
    const { prompt, jobId, title, userId, mode, existingHtml, editInstructions } = body;
    
    // Check if this is an EDIT request
    const isEdit = mode === 'edit' && existingHtml && editInstructions;
    
    if (isEdit) {
      // EDIT MODE
      console.log('[Generate ' + requestId + '] EDIT MODE');
      
      if (!jobId) {
        return NextResponse.json({ error: 'jobId diperlukan' }, { status: 400 });
      }
      
      createJob(jobId, title || 'Edit Website', userId);
      
      const zai = await getZAI();
      if (!zai) {
        updateJob(jobId, { status: 'failed', error: 'Gagal inisialisasi AI' });
        return NextResponse.json({ error: 'Gagal menginisialisasi AI' }, { status: 500 });
      }
      
      const editPrompt = `Ini adalah website HTML yang sudah ada:

${existingHtml}

Tolong UPDATE website ini sesuai instruksi berikut:
${editInstructions}

ATURAN UPDATE:
- Pertahankan SEMUA konten yang sudah ada
- Hanya UBAH/TAMBAH sesuai instruksi user
- Jangan hapus section yang tidak perlu
- Pertahankan style dan struktur
- Return HTML LENGKAP yang sudah diupdate
- Jangan pakai img tag atau background-image url()
- Jangan pakai scroll animation
- Jangan ada JS yang hide/destroy konten
- Pastikan scroll berfungsi normal
- Konten harus tetap PANJANG dan LENGKAP`;

      let completion;
      try {
        completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: editPrompt }
          ],
          max_tokens: 8000,
          temperature: 0.5
        });
      } catch (aiError: any) {
        console.error('[Generate ' + requestId + '] AI error:', aiError);
        updateJob(jobId, { status: 'failed', error: aiError.message });
        return NextResponse.json({ error: 'AI error: ' + aiError.message }, { status: 500 });
      }
      
      let htmlContent = stripMarkdownCodeBlocks(completion.choices?.[0]?.message?.content || '');
      
      if (htmlContent.length < 200) {
        updateJob(jobId, { status: 'failed', error: 'HTML terlalu pendek' });
        return NextResponse.json({ error: 'HTML terlalu pendek' }, { status: 500 });
      }
      
      // Fix truncated HTML
      if (!htmlContent.includes('</body>')) {
        htmlContent = htmlContent + '\n</div>\n</section>\n' + LOADER_JS + '\n</body>';
      }
      if (!htmlContent.includes('</html>')) {
        htmlContent = htmlContent + '\n</html>';
      }
      
      // Inject loader if missing
      if (!htmlContent.includes('#loader')) {
        htmlContent = htmlContent.replace('</head>', LOADER_CSS + '\n</head>');
      }
      if (!htmlContent.includes('id="loader"')) {
        htmlContent = htmlContent.replace(/<body[^>]*>/i, '$&\n' + LOADER_HTML);
      }
      
      const duration = Date.now() - startTime;
      console.log('[Generate ' + requestId + '] EDIT SUCCESS in ' + duration + 'ms');
      
      updateJob(jobId, { status: 'completed', htmlContent });
      
      return NextResponse.json({
        success: true,
        jobId,
        status: 'completed',
        htmlContent,
        duration,
        charCount: htmlContent.length,
        mode: 'edit'
      });
    }
    
    // NEW WEBSITE MODE
    if (!prompt || !jobId) {
      return NextResponse.json({ error: 'Prompt dan jobId diperlukan' }, { status: 400 });
    }
    
    // Step 2: Create job
    console.log('[Generate ' + requestId + '] Step 2: Creating job...');
    createJob(jobId, title || 'Untitled', userId);
    
    // Step 3: Initialize AI
    console.log('[Generate ' + requestId + '] Step 3: Initializing AI...');
    const zai = await getZAI();
    
    if (!zai) {
      updateJob(jobId, { status: 'failed', error: 'Gagal inisialisasi AI' });
      return NextResponse.json({ error: 'Gagal menginisialisasi AI' }, { status: 500 });
    }
    
    // Step 4: Call AI - INCREASED TOKENS
    console.log('[Generate ' + requestId + '] Step 4: Calling AI with max_tokens 8000...');
    let completion;
    try {
      completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        max_tokens: 8000,
        temperature: 0.7
      });
    } catch (aiError: any) {
      console.error('[Generate ' + requestId + '] AI error:', aiError);
      updateJob(jobId, { status: 'failed', error: aiError.message });
      return NextResponse.json({ error: 'AI error: ' + aiError.message }, { status: 500 });
    }
    
    // Step 5: Process response
    console.log('[Generate ' + requestId + '] Step 5: Processing response...');
    const rawContent = completion.choices?.[0]?.message?.content;
    
    if (!rawContent) {
      updateJob(jobId, { status: 'failed', error: 'AI tidak menghasilkan konten' });
      return NextResponse.json({ error: 'AI tidak menghasilkan konten' }, { status: 500 });
    }
    
    console.log('[Generate ' + requestId + '] Raw content: ' + rawContent.length + ' chars');
    
    // Step 6: Clean HTML
    let htmlContent = stripMarkdownCodeBlocks(rawContent);
    console.log('[Generate ' + requestId + '] Cleaned: ' + htmlContent.length + ' chars');
    
    // Step 6.3: Fix truncated HTML
    const isTruncated = !htmlContent.includes('</body>') || !htmlContent.includes('</html>');
    if (isTruncated) {
      console.log('[Generate ' + requestId + '] HTML truncated, fixing...');
      if (!htmlContent.includes('</body>')) {
        htmlContent = htmlContent + '\n</div>\n</section>\n' + LOADER_JS + '\n</body>';
      }
      if (!htmlContent.includes('</html>')) {
        htmlContent = htmlContent + '\n</html>';
      }
      console.log('[Generate ' + requestId + '] Fixed truncated HTML');
    }
    
    // Step 6.5: Inject loader code if missing
    const hasLoader = htmlContent.includes('id="loader"') || htmlContent.includes('id=\'loader\'');
    
    if (!hasLoader) {
      console.log('[Generate ' + requestId + '] Injecting loader code...');
      
      if (!htmlContent.includes('#loader')) {
        htmlContent = htmlContent.replace('</head>', LOADER_CSS + '\n</head>');
      }
      
      htmlContent = htmlContent.replace(/<body[^>]*>/i, function(match) {
        return match + '\n' + LOADER_HTML;
      });
      
      // Add JS if not present
      if (!htmlContent.includes('setTimeout')) {
        htmlContent = htmlContent.replace('</body>', LOADER_JS + '\n</body>');
      }
      
      console.log('[Generate ' + requestId + '] Loader injected');
    }
    
    // Remove any dangerous scripts that might hide content
    htmlContent = htmlContent.replace(/document\.body\.style\.display\s*=\s*['"]none['"]/gi, '');
    htmlContent = htmlContent.replace(/document\.body\.innerHTML\s*=\s*['"]['"]/gi, '');
    htmlContent = htmlContent.replace(/overflow:\s*hidden/gi, 'overflow: auto');
    
    if (htmlContent.length < 200) {
      updateJob(jobId, { status: 'failed', error: 'HTML terlalu pendek' });
      return NextResponse.json({ error: 'HTML terlalu pendek' }, { status: 500 });
    }
    
    // Step 7: Return success
    const duration = Date.now() - startTime;
    console.log('[Generate ' + requestId + '] SUCCESS in ' + duration + 'ms');
    console.log('[Generate ' + requestId + '] Lines: ' + htmlContent.split('\n').length);
    console.log('='.repeat(50) + '\n');
    
    updateJob(jobId, { status: 'completed', htmlContent });
    
    return NextResponse.json({
      success: true,
      jobId,
      status: 'completed',
      htmlContent,
      duration,
      charCount: htmlContent.length,
      lineCount: htmlContent.split('\n').length
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[Generate ' + requestId + '] ERROR after ' + duration + 'ms:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Website Generate API',
    status: 'ready',
    modes: ['new', 'edit'],
    max_tokens: 8000
  });
}
