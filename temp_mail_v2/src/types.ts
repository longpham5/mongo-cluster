import type { z } from "zod";

import type { emailAddressSchema, emailSchema } from "@/utils/zod";

export type EmailAddress = z.infer<typeof emailAddressSchema>;
export type SimplifiedEmail = z.infer<typeof emailSchema>;

export type DatabaseInbox = {
  id: string;
  textContent: string | null;
  htmlContent: string | null;
  subject: string | null;
  expiresAt: string;
  createdAt: string;
  fromAddress: string | null;
  toAddress: string;
};

export type DatabaseEmail = {
  id: string;
  subject: string | null;
  createdAt: string;
  expiresAt: string;
  fromAddress: string | null;
  toAddress: string;
};

export type DatabaseEmails = DatabaseEmail[];

export type Result<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: Error;
    };
