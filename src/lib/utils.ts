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

// Retorna o título e emoji de acordo com o valor total doado
export function calcularCargo(total: number): { titulo: string, emoji: string } {
  if (total >= 5000000000) return { titulo: 'Personalizado', emoji: '👑' };
  if (total >= 2500000000) return { titulo: 'Filantropo', emoji: '🪙' };
  if (total >= 1000000000) return { titulo: 'Bilionário', emoji: '💷' };
  if (total >= 500000000) return { titulo: 'Milionário', emoji: '💵' };
  if (total >= 250000000) return { titulo: 'Generoso', emoji: '💰' };
  return { titulo: 'Membro', emoji: '' };
}
