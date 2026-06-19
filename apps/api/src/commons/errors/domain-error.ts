import { HttpException, HttpStatus } from '@nestjs/common';

export class DomainError extends HttpException {
  static internal(code: string, message: string): DomainError {
    return new DomainError(code, message, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  constructor(
    code: string,
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(
      {
        code,
        error:
          status >= HttpStatus.INTERNAL_SERVER_ERROR
            ? 'InternalServerError'
            : 'DomainError',
        message,
      },
      status,
    );
  }
}
