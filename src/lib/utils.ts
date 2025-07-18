import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Verifica se o usuário possui permissão com base no cargo.
 * @param userRole Cargo do usuário
 * @param allowedRoles Lista de cargos permitidos
 */
export function hasRolePermission(userRole: string | null | undefined, allowedRoles: string[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}
