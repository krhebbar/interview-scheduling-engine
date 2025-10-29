/**
 * Custom error types for the Interview Scheduling Engine.
 */

export class SchedulingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ConfigurationError extends SchedulingError {
  constructor(message: string) {
    super(message);
  }
}

export class SlotBookingError extends SchedulingError {
  constructor(message: string) {
    super(message);
  }
}

export class AlgorithmError extends SchedulingError {
  constructor(message: string) {
    super(message);
  }
}

export class ValidationError extends SchedulingError {
  constructor(message: string) {
    super(message);
  }
}
