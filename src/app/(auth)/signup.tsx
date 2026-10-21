import AuthForm from '@/components/AuthForm';
import { useAuth } from '@/lib/auth';

export default function Signup() {
  const { signUp } = useAuth();
  return <AuthForm mode="signup" onSubmit={signUp} />;
}
