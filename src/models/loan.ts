// Tipos base del Loan. Los vamos a ir refinando cuando usemos Dynamo.

export interface LoanSnapshot {
  id: string;
  // TODO: agregar borrowerFlags, borrowerSteps.titleVerification, etc.
}
