/**
 * Module declarations for packages not yet installed in this environment.
 * These will be replaced by actual types once `npm install` runs on a machine
 * with registry access.
 */

declare module "@simplewebauthn/server" {
  export function generateRegistrationOptions(opts: any): Promise<any>;
  export function verifyRegistrationResponse(opts: any): Promise<any>;
  export function generateAuthenticationOptions(opts: any): Promise<any>;
  export function verifyAuthenticationResponse(opts: any): Promise<any>;
}

declare module "otplib" {
  export const authenticator: {
    generateSecret(): string;
    check(token: string, secret: string): boolean;
    keyuri(user: string, service: string, secret: string): string;
    generate(secret: string): string;
  };
}

declare module "stripe" {
  class Stripe {
    constructor(key: string, opts?: any);
    accounts: any;
    accountLinks: any;
    paymentIntents: any;
    refunds: any;
    transfers: any;
    payouts: any;
    webhooks: { constructEvent(body: any, sig: string, secret: string): any };
  }
  namespace Stripe {
    interface Event {
      type: string;
      data: { object: any };
    }
  }
  export = Stripe;
}

declare module "@sinclair/typebox" {
  export const Type: {
    Object(props: any, opts?: any): any;
    String(opts?: any): any;
    Number(opts?: any): any;
    Boolean(opts?: any): any;
    Array(items: any, opts?: any): any;
    Optional(schema: any): any;
    Enum(e: any): any;
    Union(schemas: any[]): any;
    Literal(value: any): any;
    Integer(opts?: any): any;
    Null(): any;
    Any(): any;
    Void(): any;
    Record(key: any, value: any): any;
    Partial(schema: any, opts?: any): any;
    Required(schema: any, opts?: any): any;
    Ref(ref: any): any;
    Intersect(schemas: any[]): any;
    Pick(schema: any, keys: any): any;
    Omit(schema: any, keys: any): any;
  };
  export type Static<T> = any;
}

declare module "@fastify/type-provider-typebox" {
  export type TypeBoxTypeProvider = any;
  export { Type, Static } from "@sinclair/typebox";
}
