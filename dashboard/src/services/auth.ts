import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInWithFacebook(): Promise<User> {
  const result = await signInWithPopup(auth, facebookProvider);
  return result.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(result.user, { displayName });
  }
  return result.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function getAuthErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  const messages: Record<string, string> = {
    'auth/invalid-email': 'Correo electrónico inválido.',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
    'auth/user-not-found': 'No existe una cuenta con este correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-credential': 'Credenciales inválidas. Verifique su correo y contraseña.',
    'auth/email-already-in-use': 'Este correo ya está registrado.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/popup-closed-by-user': 'Inicio de sesión cancelado.',
    'auth/account-exists-with-different-credential':
      'Ya existe una cuenta con este correo usando otro método de inicio de sesión.',
    'auth/popup-blocked': 'Permita ventanas emergentes para iniciar sesión.',
  };
  return messages[code] ?? 'Error de autenticación. Intente nuevamente.';
}
