export interface CurrencyRepository {
  // True when the code exists in the currency catalog and is active.
  isActive(code: string): Promise<boolean>;
}
