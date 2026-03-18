/**
 * Z-AI SDK Helper Module
 * Ensures proper token configuration and provides fallback mechanisms
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import ZAI from 'z-ai-web-dev-sdk';

interface ZAIConfig {
  baseUrl?: string;
  apiKey?: string;
  token?: string;
  chatId?: string;
  userId?: string;
}

// Cache for config and SDK instance
let cachedConfig: ZAIConfig | null = null;
let cachedZAI: Awaited<ReturnType<typeof ZAI.create>> | null = null;
let configError: string | null = null;

/**
 * Read Z-AI config file synchronously from multiple possible locations
 */
function readConfigFileSync(): ZAIConfig | null {
  const homeDir = os.homedir();
  const cwd = process.cwd();
  
  const configPaths = [
    // Project directory (highest priority)
    path.join(cwd, '.z-ai-config'),
    // Home directory
    path.join(homeDir, '.z-ai-config'),
    // System directory
    '/etc/.z-ai-config',
  ];

  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);
        console.log('[Z-AI] ✅ Config loaded from:', configPath);
        console.log('[Z-AI] Config details:', {
          hasBaseUrl: !!config.baseUrl,
          hasApiKey: !!config.apiKey,
          hasToken: !!config.token,
          tokenLength: config.token?.length || 0,
          baseUrl: config.baseUrl
        });
        return config;
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.log('[Z-AI] ❌ Could not read config from:', configPath, '-', errMsg);
    }
  }

  return null;
}

/**
 * Get Z-AI configuration with environment variable fallback
 */
export function getZAIConfig(): ZAIConfig | null {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Try reading from config file first
  const fileConfig = readConfigFileSync();
  
  if (fileConfig) {
    cachedConfig = fileConfig;
    return cachedConfig;
  }

  // Fallback to environment variables
  const envConfig: ZAIConfig = {
    baseUrl: process.env.ZAI_BASE_URL || process.env.Z_AI_BASE_URL,
    apiKey: process.env.ZAI_API_KEY || process.env.Z_AI_API_KEY,
    token: process.env.ZAI_TOKEN || process.env.Z_AI_TOKEN,
    chatId: process.env.ZAI_CHAT_ID || process.env.Z_AI_CHAT_ID,
    userId: process.env.ZAI_USER_ID || process.env.Z_AI_USER_ID,
  };

  // Only use env config if at least baseUrl is present
  if (envConfig.baseUrl) {
    console.log('[Z-AI] ✅ Using environment variable config');
    cachedConfig = envConfig;
    return cachedConfig;
  }

  console.error('[Z-AI] ❌ No valid configuration found!');
  console.error('[Z-AI] Tried locations:');
  console.error('[Z-AI]   - ./.z-ai-config');
  console.error('[Z-AI]   - ~/.z-ai-config');
  console.error('[Z-AI]   - /etc/.z-ai-config');
  console.error('[Z-AI]   - Environment variables (ZAI_BASE_URL, ZAI_TOKEN)');
  
  configError = 'Z-AI configuration not found. Please create .z-ai-config file or set environment variables.';
  
  return null;
}

/**
 * Check if Z-AI is properly configured
 */
export function isZAIConfigured(): { configured: boolean; error?: string } {
  const config = getZAIConfig();
  
  if (!config) {
    return {
      configured: false,
      error: configError || 'Configuration not found'
    };
  }

  if (!config.baseUrl) {
    return {
      configured: false,
      error: 'baseUrl is missing in configuration'
    };
  }

  // Need at least apiKey or token
  if (!config.apiKey && !config.token) {
    return {
      configured: false,
      error: 'Both apiKey and token are missing in configuration'
    };
  }

  return { configured: true };
}

/**
 * Initialize Z-AI SDK with proper configuration
 * Returns both the zai instance and config
 */
export async function initZAI(): Promise<{
  success: boolean;
  zai: Awaited<ReturnType<typeof ZAI.create>> | null;
  error?: string;
  config?: ZAIConfig;
}> {
  try {
    // Check configuration first
    const configCheck = isZAIConfigured();
    if (!configCheck.configured) {
      return {
        success: false,
        zai: null,
        error: configCheck.error
      };
    }

    // Return cached instance if available
    if (cachedZAI) {
      console.log('[Z-AI] ✅ Using cached SDK instance');
      return { 
        success: true, 
        zai: cachedZAI,
        config: cachedConfig || undefined
      };
    }

    const config = getZAIConfig();
    console.log('[Z-AI] 🔄 Initializing SDK...');
    console.log('[Z-AI] Base URL:', config?.baseUrl);
    console.log('[Z-AI] Has Token:', !!config?.token);
    console.log('[Z-AI] Has API Key:', !!config?.apiKey);
    
    // Initialize SDK - it will read the config file automatically
    const zai = await ZAI.create();
    
    // Cache the instance
    cachedZAI = zai;

    console.log('[Z-AI] ✅ SDK initialized successfully');
    
    return { 
      success: true, 
      zai,
      config: config || undefined
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Z-AI] ❌ Failed to initialize SDK:', errorMessage);
    
    return {
      success: false,
      zai: null,
      error: errorMessage
    };
  }
}

/**
 * Clear cached instances (useful for testing or re-initialization)
 */
export function clearCache(): void {
  cachedConfig = null;
  cachedZAI = null;
  configError = null;
  console.log('[Z-AI] 🔄 Cache cleared');
}

/**
 * Debug: Print current configuration status
 */
export function debugConfig(): void {
  console.log('[Z-AI] === Configuration Debug ===');
  console.log('[Z-AI] Cached config:', cachedConfig ? 'YES' : 'NO');
  console.log('[Z-AI] Cached SDK:', cachedZAI ? 'YES' : 'NO');
  console.log('[Z-AI] Config error:', configError || 'NONE');
  
  if (cachedConfig) {
    console.log('[Z-AI] Config details:');
    console.log('[Z-AI]   - baseUrl:', cachedConfig.baseUrl || 'MISSING');
    console.log('[Z-AI]   - hasApiKey:', !!cachedConfig.apiKey);
    console.log('[Z-AI]   - hasToken:', !!cachedConfig.token);
    console.log('[Z-AI]   - tokenLength:', cachedConfig.token?.length || 0);
    console.log('[Z-AI]   - chatId:', cachedConfig.chatId || 'MISSING');
    console.log('[Z-AI]   - userId:', cachedConfig.userId || 'MISSING');
  }
  console.log('[Z-AI] ============================');
}

// Default export
export default {
  getZAIConfig,
  isZAIConfigured,
  initZAI,
  clearCache,
  debugConfig
};
