export function calculateRisk(knownDevice) {
  if (knownDevice && knownDevice.isTrusted) {
    return "LOW";
  }
  return "HIGH";
}

export function shouldRequireTotp(risk, userHasTotpEnabled) {
  return risk === "HIGH" && userHasTotpEnabled;
}
