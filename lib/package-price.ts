/**
 * Quanto custa um pacote de tratamento, agora (084, T-4).
 *
 * A conta vivia dentro de `/api/patient/packages/checkout`, num `switch` de três
 * ramos. Copiá-la para a prévia do cupom seriam duas implementações da mesma
 * pergunta — a tela prometendo um número e o servidor cobrando outro, que é a
 * N4 do QA da 080 e o motivo de `servicePricesForPatient` existir (082).
 *
 * Então mora aqui, e as duas a chamam.
 */

export interface PacoteCobravel {
  name: string;
  currency: string;
  selectedPaymentType: string | null;
  pricePerSession: number;
  pricePerWeek: number | null;
  priceFullPackage: number | null;
  consultationFee: number;
  totalSessions: number;
  protocol?: { estimatedWeeks: number | null } | null;
}

export interface PrecoDoPacote {
  /** Em unidades da moeda (libras), **não** em centavos. */
  amount: number;
  currency: string;
  description: string;
  /** `week` quando a cobrança é semanal; `null` quando é única. */
  recurring: "week" | null;
}

export function precoDoPacote(pkg: PacoteCobravel): PrecoDoPacote {
  const semanas = pkg.protocol?.estimatedWeeks || 12;
  const currency = pkg.currency;

  switch (pkg.selectedPaymentType) {
    case "PER_SESSION":
      return {
        amount: pkg.pricePerSession + pkg.consultationFee / pkg.totalSessions,
        currency,
        description: `${pkg.name} — Single Session`,
        recurring: null,
      };
    case "WEEKLY": {
      const semanal = pkg.pricePerWeek || pkg.pricePerSession * (pkg.totalSessions / semanas);
      return {
        amount: semanal + pkg.consultationFee / semanas,
        currency,
        description: `${pkg.name} — Weekly Payment`,
        recurring: "week",
      };
    }
    case "FULL_PACKAGE":
    default: {
      const cheio = pkg.priceFullPackage || pkg.pricePerSession * pkg.totalSessions;
      return {
        amount: cheio + pkg.consultationFee,
        currency,
        description: `${pkg.name} — Full Package`,
        recurring: null,
      };
    }
  }
}
