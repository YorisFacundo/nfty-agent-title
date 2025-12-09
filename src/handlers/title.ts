import { getTitleVerification } from '../tools/dynamo.js';
import { runTitleAgent } from '../lib/ai.js';

export const handler = async (event: any) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const queryParams = event.queryStringParameters || {};
    
    const loanId = body.loanId || queryParams.loanId;
    
    if (!loanId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          error: 'loanId is required' 
        }),
      };
    }

    console.log('[HANDLER] Obteniendo titleVerification para loan:', loanId);
    const titleData = await getTitleVerification(loanId);

    if (!titleData.success || !titleData.data) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: titleData.message || 'Title verification not found'
        }),
      };
    }

    console.log('[HANDLER] Analizando con IA...');
    const aiAnalysis = await runTitleAgent(titleData.data);

    return {
      statusCode: 200,
      body: JSON.stringify(aiAnalysis),
    };
  } catch (error: any) {
    console.error('[HANDLER] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
    };
  }
};