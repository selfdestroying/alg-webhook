class ApiError extends Error {
  status: number;
  message: string;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.message = message;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export default ApiError;
