import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const RESPONSE_MESSAGE = 'resonse_message'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true); 
export const ResponseMessage = (message: string) => SetMetadata(RESPONSE_MESSAGE, message);
export const User = createParamDecorator((data: unknown, ctx: ExecutionContext)=> {
    const request = ctx.switchToHttp().getRequest();
    return request.user; 
});