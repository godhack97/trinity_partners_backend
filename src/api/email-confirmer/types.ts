import { ResetHashEntity } from "@orm/entities";

export type SendParams = {
  user_id: number,
  email: string,
  method: string
};

export type ConfirmParams = {
  hash: string,
  email: string,
  method: string
};

export type ActionParams = {
  resetHashEntity: ResetHashEntity
};

export enum EmailConfirmerMethod {
  Recovery = 'recovery',
  EmailConfirmation = 'email.confirmation',
  NotifyAboutNewPartner = 'notify.new.partner',
}