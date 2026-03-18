import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// API route to serve raw HTML content for website viewing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('[ViewAPI] Loading website:', id);
    
    const website = await db.website.findFirst({
      where: {
        id,
        status: 'COMPLETED'
      }
    });
    
    if (!website || !website.htmlContent) {
      console.log('[ViewAPI] Website not found:', id);
      return new NextResponse(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Website Tidak Ditemukan</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
              color: white;
              padding: 20px;
            }
            .container { text-align: center; max-width: 500px; }
            .icon { font-size: 60px; margin-bottom: 20px; }
            h1 { font-size: 24px; margin-bottom: 12px; }
            p { opacity: 0.9; margin-bottom: 20px; line-height: 1.6; }
            a {
              display: inline-block;
              background: white;
              color: #3B82F6;
              padding: 12px 24px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📄</div>
            <h1>Website Tidak Ditemukan</h1>
            <p>Website yang Anda cari tidak ditemukan atau belum selesai diproses.</p>
            <a href="/">Kembali ke Beranda</a>
          </div>
        </body>
        </html>
      `, {
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8'
        }
      });
    }
    
    console.log('[ViewAPI] Serving website:', website.title);
    
    // Strip markdown code blocks if present
    let htmlContent = website.htmlContent;
    
    // Remove ```html and ``` markers
    htmlContent = htmlContent.replace(/```html\s*\n?/gi, '');
    htmlContent = htmlContent.replace(/```\s*\n?/g, '');
    htmlContent = htmlContent.trim();
    
    // Ensure proper DOCTYPE
    if (!htmlContent.toLowerCase().startsWith('<!doctype')) {
      htmlContent = '<!DOCTYPE html>\n' + htmlContent;
    }
    
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
    
  } catch (error) {
    console.error('[ViewAPI] Error:', error);
    return new NextResponse(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <style>
          body { 
            font-family: sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fee2e2;
            color: #dc2626;
          }
          .container { text-align: center; padding: 40px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Terjadi Kesalahan</h1>
          <p>Gagal memuat website. Silakan coba lagi.</p>
        </div>
      </body>
      </html>
    `, {
      status: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  }
}
