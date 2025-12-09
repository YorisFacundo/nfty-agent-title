import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

// Configuración híbrida: usa variables personalizadas o las del entorno
const client = new DynamoDBClient({
  region: process.env.CUSTOM_AWS_REGION || process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.CUSTOM_AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.CUSTOM_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.CUSTOM_AWS_SECRET_ACCESS_KEY!,
  } : undefined,
});

const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'test-data';

export async function getTitleVerification(loanId: string) {
  console.log('[DYNAMO] Buscando titleVerification para loan:', loanId);

  try {
    const projectionFields = [
      'id',
      'borrowerFullName',
      'borrowerFirstName',
      'property.address.addressInformation.StreetAddress',
      'property.address.addressInformation.City',
      'property.address.addressInformation.State',
      'property.address.addressInformation.Zip9',
      'borrowerSteps.titleVerification.status',
      'borrowerSteps.titleVerification.orderDate',
      'borrowerSteps.titleVerification.vesting',
      'borrowerSteps.titleVerification.legalDescComments',
      'borrowerSteps.titleVerification.taxId',
      'borrowerSteps.titleVerification.mortgageAmount',
      'borrowerSteps.titleVerification.yearsInHome',
      'borrowerSteps.titleVerification.propertyAddress',
      'borrowerSteps.titleVerification.titleCompany',
      'borrowerSteps.titleVerification.policyNumber',
      'borrowerSteps.titleVerification.needReview',
      'borrowerSteps.titleVerification.needReviewReason',
    ];

    const expressionAttributeNames: Record<string, string> = {};
    const projectionExpression = projectionFields
      .map((field, index) => {
        if (field.includes('.')) {
          const parts = field.split('.');
          return parts
            .map((part, partIndex) => {
              const alias = `#${part}_${index}_${partIndex}`;
              expressionAttributeNames[alias] = part;
              return alias;
            })
            .join('.');
        } else {
          const alias = `#field_${index}`;
          expressionAttributeNames[alias] = field;
          return alias;
        }
      })
      .join(', ');

    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: loanId },
      ProjectionExpression: projectionExpression,
      ExpressionAttributeNames: expressionAttributeNames,
    });

    const result = await docClient.send(command);

    if (!result.Item) {
      throw new Error(`Loan con id=${loanId} no encontrado`);
    }

    console.log('[DYNAMO] Item encontrado');

    const titleVerification = result.Item.borrowerSteps?.titleVerification;

    if (!titleVerification) {
      throw new Error(`titleVerification no encontrado para loan id=${loanId}`);
    }

    console.log('[DYNAMO] titleVerification extraído correctamente');
    console.log('[DYNAMO] Campos disponibles:', JSON.stringify(titleVerification, null, 2));

    // Construir dirección completa si existe
    const propertyAddress = result.Item.property?.address?.addressInformation 
      ? `${result.Item.property.address.addressInformation.StreetAddress || ''}, ${result.Item.property.address.addressInformation.City || ''}, ${result.Item.property.address.addressInformation.State || ''} ${result.Item.property.address.addressInformation.Zip9 || ''}`.trim()
      : titleVerification.propertyAddress || 'N/A';

    return {
      success: true,
      message: 'Title verification retrieved successfully',
      data: {
        loanId: result.Item.id,
        borrowerName: result.Item.borrowerFullName || result.Item.borrowerFirstName || 'N/A',
        propertyAddress,
        titleVerification,
      },
    };
  } catch (error: any) {
    console.error('[DYNAMO] Error:', error);
    return {
      success: false,
      message: `DynamoDB error: ${error.message}`,
    };
  }
}