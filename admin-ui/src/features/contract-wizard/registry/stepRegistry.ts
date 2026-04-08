import type { ComponentType } from 'react';
import type { ContractType, PRContractStep, StepMeta, StepProps } from '../types/wizard';
import { LandlordStep } from '../components/steps/LandlordStep';
import { TenantStep } from '../components/steps/TenantStep';
import { PlaceInfoStep } from '../components/steps/PlaceInfoStep';
import { DatingStep } from '../components/steps/DatingStep';
import { MortgageStep } from '../components/steps/MortgageStep';
import { RentingStep } from '../components/steps/RentingStep';
import { SalePriceStep } from '../components/steps/SalePriceStep';
import { SaleRentingBridgeStep } from '../components/steps/SaleRentingBridgeStep';
import { SigningStep } from '../components/steps/SigningStep';
import { WitnessStep } from '../components/steps/WitnessStep';
import { FinishStep } from '../components/steps/FinishStep';

// Placeholder برای مراحلی که هنوز پیاده‌سازی نشده‌اند
const Placeholder = (_props: StepProps) => null;

export const STEP_ORDER: PRContractStep[] = [
  'DRAFT',
  'LANDLORD_INFORMATION',
  'TENANT_INFORMATION',
  'PLACE_INFORMATION',
  'DATING',
  'MORTGAGE',
  'RENTING',
  'SIGNING',
  'WITNESS',
  'FINISH',
];

// رهن و اجاره
const RENT_REGISTRY: Record<PRContractStep, StepMeta> = {
  DRAFT:                { label: 'شروع',            component: Placeholder as ComponentType<StepProps> },
  LANDLORD_INFORMATION: { label: 'اطلاعات مالک',    component: LandlordStep },
  TENANT_INFORMATION:   { label: 'اطلاعات مستاجر',  component: TenantStep },
  PLACE_INFORMATION:    { label: 'اطلاعات ملک اجاره‌ای', component: PlaceInfoStep },
  DATING:               { label: 'تاریخ‌ها',         component: DatingStep },
  MORTGAGE:             { label: 'رهن',              component: MortgageStep },
  RENTING:              { label: 'اجاره',            component: RentingStep },
  SIGNING:              { label: 'امضا',             component: SigningStep },
  WITNESS:              { label: 'شاهد',             component: WitnessStep },
  FINISH:               { label: 'پایان',            component: FinishStep },
};

// خرید و فروش
const SALE_REGISTRY: Record<PRContractStep, StepMeta> = {
  DRAFT:                { label: 'شروع',             component: Placeholder as ComponentType<StepProps> },
  LANDLORD_INFORMATION: { label: 'اطلاعات فروشنده',  component: LandlordStep },
  TENANT_INFORMATION:   { label: 'اطلاعات خریدار',   component: TenantStep },
  PLACE_INFORMATION:    { label: 'اطلاعات ملک',      component: PlaceInfoStep },
  DATING:               { label: 'تاریخ‌ها',          component: DatingStep },
  MORTGAGE:             { label: 'قیمت فروش',        component: SalePriceStep },
  RENTING:              { label: 'تأیید پرداخت',     component: SaleRentingBridgeStep },
  SIGNING:              { label: 'امضا',              component: SigningStep },
  WITNESS:              { label: 'شاهد',              component: WitnessStep },
  FINISH:               { label: 'پایان',             component: FinishStep },
};

export function getStepRegistry(contractType: ContractType): Record<PRContractStep, StepMeta> {
  if (contractType === 'PROPERTY_RENT') return RENT_REGISTRY;
  /* خرید/فروش و سایر انواع v2: همان مسیر فروش تا فرم اختصاصی هر نوع تکمیل شود */
  return SALE_REGISTRY;
}

export function getProgress(currentStep: PRContractStep): number {
  const index = STEP_ORDER.indexOf(currentStep);
  if (index < 0) return 0;
  return Math.round((index / (STEP_ORDER.length - 1)) * 100);
}
