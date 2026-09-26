import { getErrorMessage } from '@/utils/errorMap';

export class ApiError extends Error {
           status        ;
           code                    ;
           fieldErrors                          ;
           apiMessage        ;
           data         ;

  constructor(params

   ) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.fieldErrors = params.fieldErrors ?? {};
    this.apiMessage = params.message;
    this.data = params.data;
  }

  get friendlyMessage()         {
    return getErrorMessage(this.code, this.apiMessage);
  }

  static fromUnknown(error         )           {
    if (error instanceof ApiError) return error;
    if (error instanceof Error) {
      return new ApiError({ status: 0, message: error.message });
    }
    return new ApiError({ status: 0, message: 'An unknown error occurred' });
  }
}
