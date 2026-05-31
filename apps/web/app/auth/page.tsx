import { LivoriaClientApp } from '@/next/LivoriaClientApp';
import { AuthStaticShell } from './AuthStaticShell';

export default function Page() {
  return (
    <>
      <AuthStaticShell />
      <LivoriaClientApp />
    </>
  );
}
