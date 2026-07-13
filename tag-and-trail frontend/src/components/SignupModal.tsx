import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { X } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';

export default function SignupModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signup, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signup(email, password);
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/10 p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-[420px]">
        <button
          onClick={() => navigate('/')}
          className="absolute -right-2 -top-2 z-10 rounded-full border border-slate-200 bg-white p-1 shadow-lg transition-colors hover:bg-slate-100"
        >
          <X className="h-4 w-4 text-slate-600" />
        </button>
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <span className="bg-gradient-to-r from-sky-600 to-cyan-500 bg-clip-text text-2xl font-bold text-transparent">
                Tag & Trail
              </span>
            </div>
            <CardTitle>Create an account</CardTitle>
            <CardDescription>Sign up to start organizing your content.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input type="email" placeholder="Email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} required />
              <Input type="password" placeholder="Password" value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} required />
              <Button type="submit" className="w-full">Sign Up</Button>
              <Button variant="outline" className="w-full">
                <FcGoogle className="mr-2 size-5" />
                Sign up with Google
              </Button>
              <p className="text-center text-sm text-slate-500">
                Already have an account? <Link to="/login" className="text-sky-600 hover:underline">Login</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}