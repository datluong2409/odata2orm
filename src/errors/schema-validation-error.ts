/**
 * Custom error for schema validation failures
 */

export class SchemaValidationError extends Error {
  public readonly field: string;
  public readonly operation: string;

  constructor(
    message: string, 
    field: string, 
    operation: 'filter' | 'select' | 'orderby' = 'filter'
  ) {
    super(message);
    this.name = 'SchemaValidationError';
    this.field = field;
    this.operation = operation;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SchemaValidationError);
    }
  }
}
