import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registro',
};

type RegisterLayoutProps = {
  children: React.ReactNode;
};

const RegisterLayout = ({ children }: RegisterLayoutProps) => {
  return children;
};

export default RegisterLayout;
