
export { auth as middleware } from './auth';

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ['/((?!api|_next/static|_next/image|images|datasets|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|json)$).*)'],
};

