import Ajv2020, { type ErrorObject } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import schema from "../../data/schema.json";

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSchema(document: unknown): ValidationResult {
  const valid = validate(document) as boolean;
  if (!valid) {
    const errors = (validate.errors ?? []).map(
      (e: ErrorObject) => `${e.instancePath} ${e.message}`
    );
    return { valid: false, errors };
  }
  return { valid: true, errors: [] };
}