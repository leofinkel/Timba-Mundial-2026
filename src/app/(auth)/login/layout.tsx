import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar Sesión',
};

type LoginLayoutProps = {
  children: React.ReactNode;
};

const LoginLayout = ({ children }: LoginLayoutProps) => {
  return children;
};

export default LoginLayout;
