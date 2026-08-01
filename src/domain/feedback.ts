import type { FeedbackInput } from "../db/types.js";

export interface FeedbackValues {
  name: string;
  email: string;
  message: string;
  rating: string;
  publicConsent: boolean;
}

export type FeedbackField = "name" | "email" | "message" | "rating";
export type FeedbackErrors = Partial<Record<FeedbackField, string>>;

export interface FeedbackValidationResult {
  errors: FeedbackErrors;
  input?: FeedbackInput;
  values: FeedbackValues;
}

const emailPattern = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export const emptyFeedbackValues: FeedbackValues = {
  name: "",
  email: "",
  message: "",
  rating: "",
  publicConsent: false,
};

export function validateFeedback(values: FeedbackValues): FeedbackValidationResult {
  const normalizedValues: FeedbackValues = {
    name: values.name.trim(),
    email: values.email.trim(),
    message: values.message.trim(),
    rating: values.rating.trim(),
    publicConsent: values.publicConsent,
  };
  const errors: FeedbackErrors = {};

  if (!normalizedValues.name) errors.name = "Enter your name.";
  else if (normalizedValues.name.length > 100) errors.name = "Name must be 100 characters or fewer.";

  if (!normalizedValues.email) errors.email = "Enter your email address.";
  else if (normalizedValues.email.length > 254 || !emailPattern.test(normalizedValues.email)) errors.email = "Enter a valid email address.";

  if (!normalizedValues.message) errors.message = "Enter your feedback.";
  else if (normalizedValues.message.length < 10) errors.message = "Feedback must be at least 10 characters.";
  else if (normalizedValues.message.length > 2_000) errors.message = "Feedback must be 2,000 characters or fewer.";

  if (!/^[1-5]$/.test(normalizedValues.rating)) errors.rating = "Choose a rating from 1 to 5.";

  if (Object.keys(errors).length) return { errors, values: normalizedValues };

  return {
    errors,
    values: normalizedValues,
    input: {
      name: normalizedValues.name,
      email: normalizedValues.email.toLowerCase(),
      message: normalizedValues.message,
      rating: Number(normalizedValues.rating),
      publicConsent: normalizedValues.publicConsent,
    },
  };
}
