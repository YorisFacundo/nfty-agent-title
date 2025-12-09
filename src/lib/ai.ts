import { generateText } from 'ai';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { TITLE_SYSTEM_PROMPT } from '../prompts/title-system-general.js';

const bedrock = createAmazonBedrock({
  region: 'us-east-1',
});

const model = bedrock('us.amazon.nova-micro-v1:0');

export async function runTitleAgent(loanData: any) {
  const { loanId, borrowerName, propertyAddress, titleVerification } = loanData;

  // Extraer razones de revisión si existen (con manejo seguro)
  let reviewReasons = '';
  let needReviewStatus = 'N/A';
  
  if (titleVerification.needReview !== undefined && titleVerification.needReview !== null) {
    needReviewStatus = titleVerification.needReview ? 'SI' : 'NO';
    
    if (titleVerification.needReview && titleVerification.needReviewReason) {
      try {
        if (Array.isArray(titleVerification.needReviewReason)) {
          const reasons = titleVerification.needReviewReason
            .map((item: any, index: number) => {
              const message = item?.message || JSON.stringify(item);
              return `${index + 1}. ${message}`;
            })
            .join('\n');
          reviewReasons = `\n\nRAZONES DE REVISION:\n${reasons}`;
        } else {
          reviewReasons = `\n\nRAZONES DE REVISION:\n${JSON.stringify(titleVerification.needReviewReason)}`;
        }
      } catch (error) {
        console.warn('[AI] Error procesando needReviewReason:', error);
        reviewReasons = '\n\nRAZONES DE REVISION:\n(Error al procesar las razones)';
      }
    }
  }

 const prompt = `
Analiza la verificacion de titulo del prestamo con el siguiente formato:

DATOS DEL CASO:
Loan ID: ${loanId}
Prestatario: ${borrowerName}
Propiedad: ${propertyAddress}
Monto hipoteca: ${titleVerification.mortgageAmount || 'N/A'}
Necesita revision: ${needReviewStatus}${reviewReasons}

Genera un resumen ejecutivo para el equipo de CX con este formato exacto:

ESTADO: El prestamo ${loanId} del prestatario ${borrowerName} [NECESITA / NO NECESITA] revision.

MOTIVO:
[Explica en 2-3 lineas claras y simples la razon principal para que CX entienda el problema]

DOCUMENTOS FALTANTES:
[Lista numerada de documentos que debe solicitar CX al cliente, o "Ninguno"]

INCONSISTENCIAS DETECTADAS:
[Lista numerada de problemas que CX debe comunicar al cliente, o "Ninguna"]

ACCIONES PARA CX:
1. [Que debe hacer CX especificamente con el cliente]
2. [Que debe solicitar o verificar CX]
[o "Ninguna - puede proceder" si todo esta correcto]

RECOMENDACION FINAL: 
[APROBAR - CX puede dar luz verde al cliente]
[SOLICITAR: lista exacta de documentos que CX debe pedir al cliente]
[RECHAZAR: razon clara que CX debe comunicar al cliente]
Con explicacion simple para que CX entienda que decirle al cliente
`;

  try {
    console.log('[AI] Llamando a Bedrock Nova Micro...');
    
    const { text } = await generateText({
      model,
      system: TITLE_SYSTEM_PROMPT,
      prompt,
    });

    console.log('[AI] Respuesta recibida de Bedrock');

    // Limpiar y formatear el texto
    const formattedText = text
      .replace(/\n{3,}/g, '\n\n')  // Reducir múltiples saltos de línea
      .replace(/[""]/g, '"')        // Normalizar comillas
      .replace(/['']/g, "'")        // Normalizar apóstrofes
      .trim();

    // Extraer secciones específicas
    const extractSection = (text: string, sectionName: string): string => {
      const regex = new RegExp(`${sectionName}:\\s*([^]*?)(?=\\n\\n[A-Z]|$)`, 'i');
      const match = text.match(regex);
      return match ? match[1].trim() : 'N/A';
    };

    return {
      datosTenidosEnCuenta: [
        'id',
        'borrowerFullName',
        'property.address',
        'borrowerSteps.titleVerification.mortgageAmount',
        'borrowerSteps.titleVerification.needReview',
        'borrowerSteps.titleVerification.needReviewReason',
      ],
      estado: extractSection(formattedText, 'ESTADO'),
      motivo: extractSection(formattedText, 'MOTIVO'),
      documentosFaltantes: extractSection(formattedText, 'DOCUMENTOS FALTANTES'),
      inconsistencias: extractSection(formattedText, 'INCONSISTENCIAS DETECTADAS'),
      accionesParaCX: extractSection(formattedText, 'ACCIONES PARA CX'),
      recomendacionFinal: extractSection(formattedText, 'RECOMENDACION FINAL'),
    };
  } catch (error: any) {
    console.error('[AI] Error llamando a Bedrock:', error);
    throw new Error(`AI Agent failed: ${error.message}`);
  }
}