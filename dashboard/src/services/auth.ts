import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  type AuthProvider,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: 'select_account' });

async function signInWithOAuth(provider: AuthProvider): Promise<User> {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    const code = (error as { code?: string })?.code ?? '';
    if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, provider);
      throw Object.assign(new Error('Redirecting for sign-in'), {
        code: 'auth/redirect-pending',
      });
    }
    throw error;
  }
}

export async function signInWithGoogle(): Promise<User> {
  return signInWithOAuth(googleProvider);
}

/** Call once on app load before onAuthStateChanged (redirect fallback only). */
export async function completeOAuthRedirect(): Promise<User | null> {
  const result = await getRedirectResult(auth);
  return result?.user ?? null;
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
    'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase Authentication.',
    'auth/operation-not-allowed': 'Este método de inicio de sesión no está habilitado.',
  };
  return messages[code] ?? 'Error de autenticación. Intente nuevamente.';
}
